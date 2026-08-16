"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { registrarLog } from "@/lib/auditoria";
import { hojeBrasil } from "@/lib/dataUtils";

// ============================
// LOGIN
// ============================
export type LoginFormState = {
  error: string | null;
};

export async function loginWithPassword(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const supabase = await createSupabaseServerClient();

  const email = formData.get("email") as string;
  const password = formData.get("senha") as string;

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !data.user) {
    return { error: "E-mail ou senha incorretos." };
  }

  // Busca por e-mail ignorando maiúscula/minúscula: o login do Supabase
  // normaliza pra minúsculo, mas o e-mail cadastrado em usuarios/atendentes
  // pode ter sido digitado com maiúsculas — comparação exata (eq) já deixou
  // gente de fora ("usuário não encontrado" mesmo com senha certa).
  const emailBusca = email.trim().toLowerCase().replace(/[%_\\]/g, (c) => "\\" + c);

  // 1. Busca na tabela usuarios (familia, gestao, adm, etc)
  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("*")
    .ilike("email", emailBusca)
    .maybeSingle();

  console.log("Usuario encontrado:", usuario);
  console.log("Erro usuario:", userError);

  if (usuario) {
    const role = usuario.role?.toString().trim().toLowerCase();
    console.log("Usuario role:", role);
    revalidatePath("/", "layout");

    await registrarLog(supabase, {
      usuario_email: email,
      usuario_nome: usuario.nome,
      acao: "Login",
      descricao: `${usuario.nome || email} entrou no sistema (${role})`,
    });

    if (role === "adm" || role === "admin") redirect("/adm/dashboard");
    if (role === "gestao") redirect("/gestao/dashboard");
    if (role === "supervisora") redirect(usuario.contata_familia === false ? "/materiais-adaptados" : "/supervisora/comunicados");
    if (role === "especialista") redirect("/especialista/escala");
    if (role === "familia") redirect("/familia");
    if (role === "financeiro") redirect("/adm/financeiro");
    if (role === "at" || role === "atendente") redirect("/atendente/dashboard");
    if (role === "aux_adm") redirect("/auxiliar/agenda");

    redirect("/adm/dashboard");
  }

  // 2. Busca na tabela atendentes (ATs e especialistas)
  const { data: atendente } = await supabase
    .from("atendentes")
    .select("*")
    .ilike("email", emailBusca)
    .maybeSingle();

  if (atendente) {
    const role = atendente.role?.toString().trim().toLowerCase();
    console.log("Atendente role:", role);
    revalidatePath("/", "layout");

    await registrarLog(supabase, {
      usuario_email: email,
      usuario_nome: atendente.nome,
      acao: "Login",
      descricao: `${atendente.nome || email} entrou no sistema (${role})`,
    });

    if (role === "adm" || role === "admin") redirect("/adm/dashboard");
    if (role === "gestao") redirect("/gestao/dashboard");
    if (role === "supervisora") redirect("/supervisora/comunicados");
    if (role === "especialista") redirect("/especialista/escala");
    if (role === "at" || role === "atendente") redirect("/atendente/dashboard");

    redirect("/atendente/dashboard");
  }

  return { error: "Acesso negado: Usuário não encontrado no sistema." };
}

// ============================
// CRIAR ATENDIMENTO (VALOR FIXO R$ 30/H)
// ============================
export async function createAtendimento(input: any) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  // O id de login (auth) nem sempre é o mesmo id da linha em `atendentes`.
  // Resolve pelo id, depois por usuario_id, depois por e-mail.
  let atendenteId: string | null = null;
  const { data: porId } = await supabase.from("atendentes").select("id").eq("id", user.id).maybeSingle();
  if (porId) {
    atendenteId = porId.id;
  } else {
    const { data: porUsuarioId } = await supabase.from("atendentes").select("id").eq("usuario_id", user.id).maybeSingle();
    if (porUsuarioId) {
      atendenteId = porUsuarioId.id;
    } else if (user.email) {
      const { data: porEmail } = await supabase.from("atendentes").select("id").eq("email", user.email).maybeSingle();
      if (porEmail) atendenteId = porEmail.id;
    }
  }

  if (!atendenteId) {
    return { success: false, error: "Seu perfil de atendente não foi encontrado no cadastro. Contate o administrador." };
  }

  const localInput = String(input.local || "").toLowerCase();
  const local = localInput.includes("clinica") ? "clinica" : localInput.includes("escola") ? "escola" : "casa";
  // Casa/Escola têm valor fixo. Clínica é digitado livremente pelo AT na hora
  // (não fica travado num valor só, já que varia por acompanhante/combinado).
  const valorHora = local === "clinica" ? Number(input.valorHora ?? 0) : 30.00;
  const horas = Number(input.horas ?? 0);
  const valorTotal = horas * valorHora;

  if (local === "clinica" && valorHora <= 0) {
    return { success: false, error: "Informe o valor por hora do atendimento na clínica." };
  }

  const criancaTexto = String(input.crianca_texto ?? "").trim() || null;
  // Fora da Clínica, criança do cadastro continua obrigatória. Na Clínica,
  // aceita um texto livre (ex: "Adaptado") no lugar de uma criança específica.
  if (local !== "clinica" && !input.crianca_id) {
    return { success: false, error: "Selecione a criança." };
  }
  if (local === "clinica" && !input.crianca_id && !criancaTexto) {
    return { success: false, error: "Selecione a criança ou informe \"Adaptado\"/uma descrição." };
  }

  const { data, error } = await supabase
    .from("atendimentos")
    .insert([{
      atendente_id: atendenteId,
      crianca_id: input.crianca_id || null,
      crianca_texto: input.crianca_id ? null : criancaTexto,
      data: input.data,
      horas,
      local,
      valor_hora: valorHora,
      valor_total: valorTotal,
      ocorrencia: String(input.ocorrencia ?? "").trim(),
      status: "pendente",
    }])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const { error: finError } = await supabase
    .from("financeiro")
    .insert([{
      atendimento_id: data.id,
      atendente_id: atendenteId,
      data: input.data,
      local,
      horas,
      valor: valorHora,
      valor_total: valorTotal,
      status: "pendente",
      crianca: input.nome_crianca || "Não informada",
    }]);

  if (finError) {
    console.error("Erro ao inserir no financeiro:", finError.message);
  }

  revalidatePath("/adm/financeiro");
  revalidatePath("/adm/dashboard");
  revalidatePath("/atendente/meus-atendimentos");

  return data;
}

// ============================
// CARREGAR DADOS DO DASHBOARD
// ============================
export async function carregarDadosDashboard() {
  try {
    const supabase = await createSupabaseServerClient();

    const hojeStr = hojeBrasil();
    const mesAtual = hojeStr.slice(0, 7);

    const { data: atendimentos, error } = await supabase
      .from("atendimentos")
      .select("status, data, valor_total")
      .gte("data", `${mesAtual}-01`)
      .lte("data", `${mesAtual}-31`)
      .order("data", { ascending: true });

    if (error) throw error;

    let totalDia = 0;
    let pendentes = 0;
    let pagos = 0;
    let despesaTotalPaga = 0;

    const despesaPorDia: Record<string, number> = {};
    const atendimentosPorSemana: Record<string, number> = {
      "Semana 1": 0, "Semana 2": 0, "Semana 3": 0, "Semana 4": 0, "Semana 5": 0,
    };

    if (atendimentos) {
      atendimentos.forEach((a) => {
        const dataFormatada = a.data ? a.data.split("T")[0] : hojeStr;
        const dataObj = new Date(dataFormatada + "T12:00:00");
        const valorTotal = Number(a.valor_total || 0);
        const statusNormalizado = String(a.status).toLowerCase();

        if (dataFormatada === hojeStr) totalDia++;

        if (statusNormalizado === "pago" || statusNormalizado === "confirmado") {
          pagos++;
          despesaTotalPaga += valorTotal;
          despesaPorDia[dataFormatada] = (despesaPorDia[dataFormatada] || 0) + valorTotal;
        } else {
          pendentes++;
        }

        const diaDoMes = dataObj.getDate();
        const semana = Math.min(5, Math.ceil(diaDoMes / 7));
        atendimentosPorSemana[`Semana ${semana}`]++;
      });
    }

    const labelsLinha = Object.keys(despesaPorDia).sort();
    const valoresLinha = labelsLinha.map((d) => despesaPorDia[d]);
    const labelsBarras = Object.keys(atendimentosPorSemana);
    const valoresBarras = labelsBarras.map((s) => atendimentosPorSemana[s]);

    return {
      success: true,
      metricas: { totalDia, pendentes, receitaMes: despesaTotalPaga, pagos },
      graficoLinha: {
        labels: labelsLinha.length > 0 ? labelsLinha.map(l => l.split("-").reverse().slice(0, 2).join("/")) : ["Sem pagamentos"],
        datasets: [{
          label: "Despesa Paga (R$)",
          data: valoresLinha.length > 0 ? valoresLinha : [0],
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.3,
          fill: true,
        }],
      },
      graficoPizza: {
        labels: ["Pendentes", "Pagos"],
        datasets: [{
          data: [pendentes, pagos],
          backgroundColor: ["#f97316", "#10b981"],
          hoverOffset: 6,
        }],
      },
      graficoBarras: {
        labels: labelsBarras,
        datasets: [{
          label: "Quantidade de Atendimentos",
          data: valoresBarras,
          backgroundColor: "rgba(59, 130, 246, 0.6)",
        }],
      },
    };
  } catch (err: any) {
    console.error("Erro no processamento do Dashboard:", err);
    return { success: false, error: err.message };
  }
}

export async function createCrianca(input: { nome: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("criancas").insert([{ nome: input.nome }]);
  if (error) return { success: false, error: error.message };
  revalidatePath("/adm/criancas");
  return { success: true };
}

// ============================
// ACESSO DE COLABORADOR (ativo/desligado)
// ============================
// Precisa da service role key (só existe no servidor) pra banir/reativar
// o login de verdade no Supabase Auth — não basta marcar `ativo=false` no
// cadastro, porque o login continuava funcionando mesmo assim. O id do
// colaborador (atendentes/colaboradoras_internas) é o mesmo id da conta
// de login, por isso dá pra usar direto sem precisar buscar por e-mail.
export async function definirAcessoColaborador(id: string, ativo: boolean) {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: ativo ? "none" : "876000h", // ~100 anos = banido até reativar
  });
  // Sem conta de login (ex: colaboradoras_internas de Apoio) não é erro —
  // só não tinha o que banir.
  if (error && !error.message.toLowerCase().includes("not found")) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}