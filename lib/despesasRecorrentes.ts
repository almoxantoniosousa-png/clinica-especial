import { hojeLocal } from "./dataUtils";

function ocorrenciaDoMes(diaVencimento: number, referencia: string): string {
  const [ano, mes] = referencia.split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(diaVencimento, ultimoDia);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function proximaOcorrencia(diaVencimento: number, apartirDe: string): string {
  const [ano, mes] = apartirDe.split("-").map(Number);
  let proxAno = ano, proxMes = mes + 1;
  if (proxMes > 12) { proxMes = 1; proxAno++; }
  return ocorrenciaDoMes(diaVencimento, `${proxAno}-${String(proxMes).padStart(2, "0")}-01`);
}

// Primeira geração de uma recorrente nova: usa a ocorrência deste mês se
// ainda não passou, senão já pula pra próxima — evita nascer uma conta
// "vencida" só porque a recorrente foi cadastrada depois do dia do mês.
function primeiraOcorrencia(diaVencimento: number, hoje: string): string {
  const doMes = ocorrenciaDoMes(diaVencimento, hoje);
  return doMes >= hoje ? doMes : proximaOcorrencia(diaVencimento, hoje);
}

// Roda no carregamento da tela de Contas a Pagar: gera a próxima Conta a
// Pagar de cada despesa recorrente ativa, quando faltar menos dias pro
// vencimento do que o configurado, e avisa no sino — pra ADM/Financeiro/Aux
// Adm nunca mais precisarem lembrar de lançar salário fixo/honorários.
export async function gerarDespesasRecorrentesPendentes(supabase: any): Promise<number> {
  const hoje = hojeLocal();
  const { data: recorrentes } = await supabase.from("despesas_recorrentes").select("*").eq("ativo", true);
  if (!recorrentes || recorrentes.length === 0) return 0;

  let geradas = 0;

  for (const r of recorrentes) {
    const proximoVencimento = r.ultima_geracao
      ? proximaOcorrencia(r.dia_vencimento, r.ultima_geracao)
      : primeiraOcorrencia(r.dia_vencimento, hoje);

    const diasParaVencer = Math.ceil(
      (new Date(proximoVencimento + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000
    );
    if (diasParaVencer > r.dias_antecedencia) continue;

    // defesa extra contra duplicar (ex: duas abas abertas ao mesmo tempo)
    const { data: jaExiste } = await supabase.from("contas_pagar")
      .select("id").eq("recorrente_id", r.id).eq("vencimento", proximoVencimento).maybeSingle();
    if (jaExiste) {
      await supabase.from("despesas_recorrentes").update({ ultima_geracao: proximoVencimento }).eq("id", r.id);
      continue;
    }

    const { error } = await supabase.from("contas_pagar").insert([{
      descricao: r.descricao,
      categoria: r.categoria,
      valor: r.valor,
      vencimento: proximoVencimento,
      status: "pendente",
      recorrente_id: r.id,
      observacao: r.observacao || null,
    }]);
    if (error) continue;

    await supabase.from("despesas_recorrentes").update({ ultima_geracao: proximoVencimento }).eq("id", r.id);
    geradas++;

    const valorFmt = Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const vencFmt = new Date(proximoVencimento + "T12:00:00").toLocaleDateString("pt-BR");
    // gestão das recorrentes é exclusiva da ADM — só ela é avisada
    await supabase.from("notificacoes").insert({
      destinatario_role: "adm",
      titulo: "🔁 Despesa recorrente gerada",
      mensagem: `${r.descricao} — R$ ${valorFmt}, vence em ${vencFmt}`,
      tipo: "financeiro",
      link: "/adm/financeiro",
      autor_nome: "Sistema",
    });
  }

  return geradas;
}
