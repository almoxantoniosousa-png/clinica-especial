"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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

  // 1. Busca na tabela usuarios (familia, gestao, adm, etc)
  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  console.log("Usuario encontrado:", usuario);
  console.log("Erro usuario:", userError);

  if (usuario) {
    const role = usuario.role?.toString().trim().toLowerCase();
    console.log("Usuario role:", role);
    revalidatePath("/", "layout");

    if (role === "adm" || role === "admin") redirect("/adm/dashboard");
    if (role === "gestao") redirect("/gestao/dashboard");
    if (role === "supervisora") redirect("/supervisora/comunicados");
    if (role === "especialista") redirect("/especialista/escala");
    if (role === "familia") redirect("/familia");
    if (role === "financeiro") redirect("/adm/financeiro");
    if (role === "at" || role === "atendente") redirect("/atendente/meus-atendimentos");
    if (role === "aux_adm") redirect("/auxiliar/agenda");

    redirect("/adm/dashboard");
  }

  // 2. Busca na tabela atendentes (ATs e especialistas)
  const { data: atendente } = await supabase
    .from("atendentes")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (atendente) {
    const role = atendente.role?.toString().trim().toLowerCase();
    console.log("Atendente role:", role);
    revalidatePath("/", "layout");

    if (role === "adm" || role === "admin") redirect("/adm/dashboard");
    if (role === "gestao") redirect("/gestao/dashboard");
    if (role === "supervisora") redirect("/supervisora/comunicados");
    if (role === "especialista") redirect("/especialista/escala");
    if (role === "at" || role === "atendente") redirect("/atendente/meus-atendimentos");

    redirect("/atendente/meus-atendimentos");
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

  const local = input.local?.toLowerCase().includes("escola") ? "escola" : "casa";
  const valorHora = 30.00;
  const horas = Number(input.horas ?? 0);
  const valorTotal = horas * valorHora;

  const { data, error } = await supabase
    .from("atendimentos")
    .insert([{
      atendente_id: user.id,
      crianca_id: input.crianca_id,
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
      atendente_id: user.id,
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

    const { data: atendimentos, error } = await supabase
      .from("atendimentos")
      .select("status, data, valor_total")
      .order("data", { ascending: true });

    if (error) throw error;

    const hojeStr = new Date().toISOString().split("T")[0];

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

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}