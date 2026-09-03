"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { Check, Trash2, Pencil } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";
import { hojeLocal, mesAtualLocal } from "@/lib/dataUtils";
import { gerarDespesasRecorrentesPendentes } from "@/lib/despesasRecorrentes";

type Aba = "contas_pagar" | "contas_receber" | "fluxo" | "emprestimos";
type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function anosDisponiveis() {
  const atual = new Date().getFullYear();
  return [atual - 1, atual, atual + 1, atual + 2];
}

type PagamentoConta = { data: string; valor: number };
type ContaPagar = {
  id: string; descricao: string; categoria: string;
  valor: number; vencimento: string; status: string;
  observacao?: string | null; pago_em?: string | null;
  pagamentos?: PagamentoConta[];
  recorrente_id?: string | null;
};
type ModeloPagar = { id: string; descricao: string; categoria: string; valor: number; observacao?: string | null };
type DespesaRecorrente = {
  id: string; descricao: string; categoria: string; valor: number;
  dia_vencimento: number; dias_antecedencia: number; ativo: boolean;
  frequencia_meses: number;
  ultima_geracao?: string | null; observacao?: string | null;
};
const FREQUENCIAS_RECORRENTE = [
  { valor: 1, label: "Mensal" },
  { valor: 2, label: "Bimestral" },
  { valor: 3, label: "Trimestral" },
  { valor: 6, label: "Semestral" },
  { valor: 12, label: "Anual" },
];
type ContaReceber = {
  id: string; crianca_id: string; mes_referencia: string;
  valor_total: number; valor_liquido?: number | null; valor_iss?: number | null;
  status: string; plano: string;
  numero_nota_fiscal?: string | null; data_envio?: string | null; observacao?: string | null;
  faturado_em?: string | null; recebido_em?: string | null;
  especialidades?: ItemEsp[];
  sessoes_realizadas?: number | null; valor_sessao?: number | null;
  plano_saude?: string | null; desconto_iss?: number | null; desconto_glosa?: number | null;
  criancas?: { nome: string };
};
type CriancaSimples = { id: string; nome: string; plano_saude?: string | null };
type AbaProps = { supabase: SupabaseClient; mesAno: string; mostrarFeedback: (tipo: "sucesso" | "erro", msg: string) => void; role?: string };
type AbaFluxoProps = { supabase: SupabaseClient; mesAno: string };
type AbaSemMesProps = { supabase: SupabaseClient; mostrarFeedback: (tipo: "sucesso" | "erro", msg: string) => void };
type Pagamento = { data: string; valor: number; numero_parcela?: number; comprovante_url?: string | null };
type Emprestimo = {
  id: string; colaborador_nome: string; colaborador_cpf?: string | null; valor_total: number; data_emprestimo: string;
  numero_parcelas: number; valor_parcela: number;
  pagamentos: Pagamento[]; status: string; observacao?: string | null;
};
type ColaboradorOpcao = { nome: string; cpf: string | null };

export default function FinanceiroPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("contas_pagar");
  const [mesAno, setMesAno] = useState(() => mesAtualLocal());
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [role, setRole] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: usuario } = await supabase.from("usuarios").select("role").eq("email", user.email).maybeSingle();
      setRole((usuario?.role || "").toString().trim().toLowerCase());
    })();
  }, [supabase]);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  const mesFormatado = new Date(mesAno + "-15").toLocaleDateString("pt-BR", {
    month: "long", year: "numeric",
  });

  function mudarMes(delta: number) {
    const [ano, mes] = mesAno.split("-").map(Number);
    const d = new Date(ano, mes - 1 + delta, 1);
    setMesAno(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const todasAbas = [
    { id: "contas_pagar",   label: "Contas a Pagar",  icon: "📤" },
    { id: "contas_receber", label: "Contas a Receber", icon: "📥" },
    { id: "fluxo",          label: "Fluxo de Caixa",  icon: "📊" },
    { id: "emprestimos",    label: "Empréstimos",     icon: "🤝" },
  ];
  // aux_adm só enxerga Faturamento (contas a pagar/receber) — fluxo de caixa e
  // empréstimos de colaboradores ficam restritos ao ADM/Gestão/Financeiro.
  const abas = role === "aux_adm"
    ? todasAbas.filter(a => a.id === "contas_pagar" || a.id === "contas_receber")
    : todasAbas;

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-light tracking-wide">Faturamento, folha e atendimentos do mês</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 h-10 w-full sm:w-auto">
          <button onClick={() => mudarMes(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition">‹</button>
          <span className="flex-1 sm:flex-initial sm:min-w-[140px] text-center text-sm font-semibold text-slate-700 capitalize px-2">{mesFormatado}</span>
          <button onClick={() => mudarMes(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition">›</button>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* ABAS */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id as Aba)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
              ${aba === a.id ? "bg-blue-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            <span>{a.icon}</span>
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>

      {/* CONTEUDO */}
      {aba === "contas_pagar"   && <AbaContasPagar   supabase={supabase} mesAno={mesAno} mostrarFeedback={mostrarFeedback} role={role}/>}
      {aba === "contas_receber" && <AbaContasReceber supabase={supabase} mesAno={mesAno} mostrarFeedback={mostrarFeedback}/>}
      {aba === "fluxo"          && <AbaFluxo         supabase={supabase} mesAno={mesAno}/>}
      {aba === "emprestimos"    && <AbaEmprestimos   supabase={supabase} mostrarFeedback={mostrarFeedback}/>}
    </div>
  );
}

// =============================================
// ABA CONTAS A PAGAR
// =============================================
function AbaContasPagar({ supabase, mesAno, mostrarFeedback, role }: AbaProps) {
  const hoje = hojeLocal();
  // Despesas Recorrentes é decisão exclusiva da ADM — Financeiro/Aux. Adm
  // continuam vendo a conta já gerada normalmente em "Contas do mês".
  const isAdm = role === "adm" || role === "admin";

  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [modelos, setModelos] = useState<ModeloPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [situacaoAberta, setSituacaoAberta] = useState(true);

  const [subaba, setSubaba] = useState<"contas" | "recorrentes">("contas");
  const [recorrentes, setRecorrentes] = useState<DespesaRecorrente[]>([]);
  const [modalRecorrenteAberto, setModalRecorrenteAberto] = useState(false);
  const [editandoRecorrenteId, setEditandoRecorrenteId] = useState<string | null>(null);
  const [descRecorrente, setDescRecorrente] = useState("");
  const [catRecorrente, setCatRecorrente] = useState("salario");
  const [valorRecorrente, setValorRecorrente] = useState("");
  const [freqRecorrente, setFreqRecorrente] = useState("1");
  const [historicoRecorrente, setHistoricoRecorrente] = useState<DespesaRecorrente | null>(null);
  const [historicoLista, setHistoricoLista] = useState<ContaPagar[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [pagandoHistoricoId, setPagandoHistoricoId] = useState<string | null>(null);
  const [valorPagHistorico, setValorPagHistorico] = useState("");
  const [dataPagHistorico, setDataPagHistorico] = useState("");
  const [erroPagHistorico, setErroPagHistorico] = useState("");
  const [processandoHistorico, setProcessandoHistorico] = useState(false);
  const [editandoObsId, setEditandoObsId] = useState<string | null>(null);
  const [obsTextoHistorico, setObsTextoHistorico] = useState("");
  const [diaRecorrente, setDiaRecorrente] = useState("5");
  const [antecedenciaRecorrente, setAntecedenciaRecorrente] = useState("5");
  const [salvandoRecorrente, setSalvandoRecorrente] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("aluguel");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvarModelo, setSalvarModelo] = useState(false);

  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [erroPagamento, setErroPagamento] = useState("");
  const [processando, setProcessando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const [editandoPagamento, setEditandoPagamento] = useState<{ contaId: string; index: number } | null>(null);
  const [valorPagamentoEdit, setValorPagamentoEdit] = useState("");
  const [dataPagamentoEdit, setDataPagamentoEdit] = useState("");
  const [erroPagamentoEdit, setErroPagamentoEdit] = useState("");

  const categorias = ["aluguel","energia","agua","internet","fornecedor","salario","imposto","outro"];

  const carregar = async () => {
    setLoading(true);
    const [ano, mes] = mesAno.split("-");
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    const { data, error } = await supabase.from("contas_pagar")
      .select("*")
      .gte("vencimento", `${ano}-${mes}-01`)
      .lte("vencimento", `${ano}-${mes}-${String(ultimoDia).padStart(2,"0")}`)
      .order("vencimento");
    if (error) mostrarFeedback("erro", "Erro ao carregar contas: " + error.message);
    setContas(data || []);
    const { data: mods } = await supabase.from("contas_pagar_modelos").select("*").order("descricao");
    setModelos(mods || []);
    const { data: recs } = await supabase.from("despesas_recorrentes").select("*").order("descricao");
    setRecorrentes(recs || []);
    setLoading(false);
  };

  // Confere se alguma despesa recorrente está na hora de virar Conta a Pagar
  // deste ciclo — roda uma vez ao abrir a tela, antes de carregar a lista.
  useEffect(() => {
    (async () => {
      const geradas = await gerarDespesasRecorrentesPendentes(supabase);
      if (geradas > 0) mostrarFeedback("sucesso", `${geradas} despesa${geradas > 1 ? "s" : ""} recorrente${geradas > 1 ? "s" : ""} gerada${geradas > 1 ? "s" : ""} automaticamente.`);
      carregar();
    })();
  }, [mesAno]);

  function fecharModalRecorrente() {
    setModalRecorrenteAberto(false);
    setEditandoRecorrenteId(null);
    setDescRecorrente(""); setCatRecorrente("salario"); setValorRecorrente("");
    setFreqRecorrente("1"); setDiaRecorrente("5"); setAntecedenciaRecorrente("5");
  }

  async function abrirHistoricoRecorrente(r: DespesaRecorrente) {
    setHistoricoRecorrente(r);
    setCarregandoHistorico(true);
    const { data } = await supabase.from("contas_pagar").select("*").eq("recorrente_id", r.id).order("vencimento", { ascending: false });
    setHistoricoLista(data || []);
    setCarregandoHistorico(false);
  }

  // Pagar direto de dentro do histórico de uma recorrente — o mês pode não
  // ser o mesmo que está selecionado na tela principal, então tem seu
  // próprio estado (não dá pra reaproveitar o modal de pagamento normal,
  // que só enxerga as contas do mês atual).
  function abrirPagamentoHistorico(c: ContaPagar) {
    setPagandoHistoricoId(c.id);
    setValorPagHistorico(restante(c).toFixed(2));
    setDataPagHistorico(hoje);
    setErroPagHistorico("");
  }
  function fecharPagamentoHistorico() {
    setPagandoHistoricoId(null); setValorPagHistorico(""); setDataPagHistorico(""); setErroPagHistorico("");
  }
  async function confirmarPagamentoHistorico(c: ContaPagar) {
    const valorAgora = Number(valorPagHistorico.replace(",", "."));
    const falta = restante(c);
    if (!valorAgora || valorAgora <= 0) { setErroPagHistorico("Informe um valor válido."); return; }
    if (!dataPagHistorico) { setErroPagHistorico("Informe a data do pagamento."); return; }
    if (valorAgora > falta + 0.01) {
      setErroPagHistorico(`O valor não pode passar do restante (R$ ${falta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`);
      return;
    }
    setProcessandoHistorico(true);
    const novosPagamentos = [...(c.pagamentos || []), { data: dataPagHistorico, valor: valorAgora }];
    const novoRestante = Number(c.valor) - novosPagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const quitado = novoRestante <= 0.01;
    await supabase.from("contas_pagar").update({
      pagamentos: novosPagamentos,
      status: quitado ? "pago" : "pendente",
      pago_em: quitado ? dataPagHistorico : null,
    }).eq("id", c.id);
    mostrarFeedback("sucesso", quitado ? "Marcado como pago!" : "Pagamento registrado!");
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: quitado ? "Pagou" : "Registrou pagamento",
      tabela: "contas_pagar",
      registro_id: c.id,
      descricao: `${quitado ? "Pagou" : "Registrou pagamento em"} conta: ${c.descricao} — R$ ${valorAgora.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${new Date(dataPagHistorico + "T12:00:00").toLocaleDateString("pt-BR")}${!quitado ? ` (restam R$ ${novoRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : ""}`,
    });
    setProcessandoHistorico(false);
    fecharPagamentoHistorico();
    if (historicoRecorrente) await abrirHistoricoRecorrente(historicoRecorrente);
    carregar();
  }

  function abrirNotaHistorico(c: ContaPagar) {
    setEditandoObsId(c.id);
    setObsTextoHistorico(c.observacao || "");
  }
  async function salvarNotaHistorico(c: ContaPagar) {
    await supabase.from("contas_pagar").update({ observacao: obsTextoHistorico.trim() || null }).eq("id", c.id);
    setEditandoObsId(null);
    if (historicoRecorrente) await abrirHistoricoRecorrente(historicoRecorrente);
    carregar();
  }

  function abrirEditarRecorrente(r: DespesaRecorrente) {
    setEditandoRecorrenteId(r.id);
    setDescRecorrente(r.descricao); setCatRecorrente(r.categoria);
    setValorRecorrente(String(r.valor)); setDiaRecorrente(String(r.dia_vencimento));
    setFreqRecorrente(String(r.frequencia_meses || 1));
    setAntecedenciaRecorrente(String(r.dias_antecedencia));
    setModalRecorrenteAberto(true);
  }

  async function salvarRecorrente() {
    if (!descRecorrente || !valorRecorrente || !diaRecorrente) {
      mostrarFeedback("erro", "Preencha descrição, valor e dia do vencimento.");
      return;
    }
    setSalvandoRecorrente(true);
    const payload = {
      descricao: descRecorrente, categoria: catRecorrente, valor: Number(valorRecorrente),
      dia_vencimento: Number(diaRecorrente), dias_antecedencia: Number(antecedenciaRecorrente) || 5,
      frequencia_meses: Number(freqRecorrente) || 1,
    };
    if (editandoRecorrenteId) {
      const { error } = await supabase.from("despesas_recorrentes").update(payload).eq("id", editandoRecorrenteId);
      setSalvandoRecorrente(false);
      if (error) { mostrarFeedback("erro", "Erro ao salvar: " + error.message); return; }
      mostrarFeedback("sucesso", "Despesa recorrente atualizada!");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("despesas_recorrentes").insert([{ ...payload, ativo: true, criado_por_nome: user?.email || null }]);
      setSalvandoRecorrente(false);
      if (error) { mostrarFeedback("erro", "Erro ao salvar: " + error.message); return; }
      mostrarFeedback("sucesso", "Despesa recorrente cadastrada! Ela vai virar conta automaticamente perto do vencimento.");
    }
    fecharModalRecorrente();
    carregar();
  }

  async function alternarAtivoRecorrente(r: DespesaRecorrente) {
    await supabase.from("despesas_recorrentes").update({ ativo: !r.ativo }).eq("id", r.id);
    carregar();
  }

  async function excluirRecorrente(id: string) {
    if (!confirm("Excluir essa despesa recorrente? As contas já geradas por ela não serão apagadas.")) return;
    await supabase.from("despesas_recorrentes").delete().eq("id", id);
    mostrarFeedback("sucesso", "Despesa recorrente removida.");
    carregar();
  }

  function diasVenc(c: ContaPagar): number {
    return Math.ceil(
      (new Date(c.vencimento + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000
    );
  }

  function statusVenc(c: ContaPagar): string {
    if (c.status === "pago") return "pago";
    const d = diasVenc(c);
    if (d < 0) return "vencida";
    if (d === 0) return "vence_hoje";
    if (d <= 7) return "em_breve";
    return "ok";
  }

  function totalPago(c: ContaPagar): number {
    return (c.pagamentos || []).reduce((acc, p) => acc + Number(p.valor || 0), 0);
  }
  function restante(c: ContaPagar): number {
    return Number(c.valor) - totalPago(c);
  }

  function handleDescricaoChange(val: string) {
    setDescricao(val);
    const m = modelos.find(m => m.descricao.toLowerCase() === val.toLowerCase());
    if (m) {
      setCategoria(m.categoria || "outro");
      if (m.valor) setValor(String(m.valor));
      if (m.observacao) setObservacao(m.observacao);
    }
  }

  function preencherDeModelo(m: ModeloPagar) {
    setDescricao(m.descricao);
    setCategoria(m.categoria || "outro");
    setValor(m.valor ? String(m.valor) : "");
    setObservacao(m.observacao || "");
  }

  function vencimentoDefault() {
    const [ano, mes] = mesAno.split("-");
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    return `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setDescricao(""); setValor(""); setVencimento(vencimentoDefault()); setObservacao("");
    setSalvarModelo(false); setCategoria("aluguel");
  }

  function abrirEditar(c: ContaPagar) {
    setEditandoId(c.id);
    setDescricao(c.descricao); setCategoria(c.categoria); setValor(String(c.valor));
    setVencimento(c.vencimento); setObservacao(c.observacao || "");
    setSalvarModelo(false);
    setModalAberto(true);
  }

  async function salvar() {
    if (!descricao || !valor || !vencimento) { mostrarFeedback("erro", "Preencha todos os campos obrigatórios."); return; }
    setSalvando(true);
    const payload = { descricao, categoria, valor: Number(valor), vencimento, observacao };
    const { data: { user } } = await supabase.auth.getUser();

    if (editandoId) {
      const { error } = await supabase.from("contas_pagar").update(payload).eq("id", editandoId);
      setSalvando(false);
      if (error) mostrarFeedback("erro", "Erro ao salvar: " + error.message);
      else {
        mostrarFeedback("sucesso", "Conta atualizada!");
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Editou",
          tabela: "contas_pagar",
          registro_id: editandoId,
          descricao: `Editou conta a pagar: ${descricao}`,
        });
        fecharModal(); carregar();
        // se veio do histórico de uma recorrente, atualiza a lista de lá também
        if (historicoRecorrente) await abrirHistoricoRecorrente(historicoRecorrente);
      }
      return;
    }

    const { data: nova, error } = await supabase.from("contas_pagar").insert([{ ...payload, status: "pendente" }]).select().single();
    if (!error && salvarModelo) {
      const jaExiste = modelos.some(m => m.descricao.toLowerCase() === descricao.toLowerCase());
      if (!jaExiste) {
        await supabase.from("contas_pagar_modelos").insert([{ descricao, categoria, valor: Number(valor), observacao }]);
      }
    }
    setSalvando(false);
    if (error) mostrarFeedback("erro", "Erro ao salvar: " + error.message);
    else {
      mostrarFeedback("sucesso", "Conta registrada!");
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Criou",
        tabela: "contas_pagar",
        registro_id: nova?.id,
        descricao: `Lançou conta a pagar: ${descricao} — R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (venc. ${new Date(vencimento + "T12:00:00").toLocaleDateString("pt-BR")})`,
      });
      fecharModal(); carregar();
    }
  }

  function abrirPagamento(c: ContaPagar) {
    setPagandoId(c.id);
    const falta = restante(c);
    setValorPagamento(falta > 0 ? falta.toFixed(2) : "");
    setDataPagamento(hoje);
    setErroPagamento("");
  }

  function fecharPagamento() {
    setPagandoId(null); setValorPagamento(""); setDataPagamento(""); setErroPagamento("");
  }

  async function registrarPagamento(c: ContaPagar) {
    const valorAgora = Number(valorPagamento.replace(",", "."));
    const falta = restante(c);
    if (!valorAgora || valorAgora <= 0) { setErroPagamento("Informe um valor válido."); return; }
    if (!dataPagamento) { setErroPagamento("Informe a data do pagamento."); return; }
    if (valorAgora > falta + 0.01) {
      setErroPagamento(`O valor não pode passar do restante (R$ ${falta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`);
      return;
    }
    setErroPagamento("");
    setProcessando(true);
    const novosPagamentos = [...(c.pagamentos || []), { data: dataPagamento, valor: valorAgora }];
    const novoRestante = Number(c.valor) - novosPagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const quitado = novoRestante <= 0.01;
    await supabase.from("contas_pagar").update({
      pagamentos: novosPagamentos,
      status: quitado ? "pago" : "pendente",
      pago_em: quitado ? dataPagamento : null,
    }).eq("id", c.id);
    mostrarFeedback("sucesso", quitado ? "Marcado como pago!" : "Pagamento registrado!");
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: quitado ? "Pagou" : "Registrou pagamento",
      tabela: "contas_pagar",
      registro_id: c.id,
      descricao: `${quitado ? "Pagou" : "Registrou pagamento em"} conta: ${c.descricao} — R$ ${valorAgora.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${new Date(dataPagamento + "T12:00:00").toLocaleDateString("pt-BR")}${!quitado ? ` (restam R$ ${novoRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : ""}`,
    });
    fecharPagamento(); setProcessando(false);
    carregar();
  }

  function abrirEditarPagamento(c: ContaPagar, index: number) {
    const p = (c.pagamentos || [])[index];
    if (!p) return;
    setEditandoPagamento({ contaId: c.id, index });
    setValorPagamentoEdit(String(p.valor));
    setDataPagamentoEdit(p.data);
    setErroPagamentoEdit("");
  }

  function fecharEdicaoPagamento() {
    setEditandoPagamento(null); setValorPagamentoEdit(""); setDataPagamentoEdit(""); setErroPagamentoEdit("");
  }

  async function aplicarPagamentos(c: ContaPagar, novosPagamentos: { data: string; valor: number }[], acaoLog: string) {
    const totalPago = novosPagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const novoRestante = Number(c.valor) - totalPago;
    const quitado = novoRestante <= 0.01;
    const ultimaData = novosPagamentos.length > 0 ? novosPagamentos.reduce((a, b) => (a.data > b.data ? a : b)).data : null;
    await supabase.from("contas_pagar").update({
      pagamentos: novosPagamentos,
      status: quitado ? "pago" : "pendente",
      pago_em: quitado ? ultimaData : null,
    }).eq("id", c.id);
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Editou",
      tabela: "contas_pagar",
      registro_id: c.id,
      descricao: `${acaoLog} em ${c.descricao} — restam R$ ${Math.max(novoRestante, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    });
    carregar();
  }

  async function salvarEdicaoPagamento(c: ContaPagar) {
    if (!editandoPagamento) return;
    const valorNovo = Number(valorPagamentoEdit.replace(",", "."));
    if (!valorNovo || valorNovo <= 0) { setErroPagamentoEdit("Informe um valor válido."); return; }
    if (!dataPagamentoEdit) { setErroPagamentoEdit("Informe a data do pagamento."); return; }
    const pagamentos = [...(c.pagamentos || [])];
    const outros = pagamentos.filter((_, i) => i !== editandoPagamento.index);
    const totalOutros = outros.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    if (totalOutros + valorNovo > Number(c.valor) + 0.01) {
      setErroPagamentoEdit(`A soma dos pagamentos não pode passar do valor do serviço (R$ ${Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`);
      return;
    }
    setErroPagamentoEdit("");
    setProcessando(true);
    const antigo = pagamentos[editandoPagamento.index];
    pagamentos[editandoPagamento.index] = { data: dataPagamentoEdit, valor: valorNovo };
    await aplicarPagamentos(
      c, pagamentos,
      `Editou pagamento (era R$ ${Number(antigo.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${new Date(antigo.data + "T12:00:00").toLocaleDateString("pt-BR")}, virou R$ ${valorNovo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${new Date(dataPagamentoEdit + "T12:00:00").toLocaleDateString("pt-BR")})`
    );
    setProcessando(false);
    fecharEdicaoPagamento();
  }

  async function excluirPagamento(c: ContaPagar, index: number) {
    const alvo = (c.pagamentos || [])[index];
    if (!alvo) return;
    setProcessando(true);
    const pagamentos = (c.pagamentos || []).filter((_, i) => i !== index);
    await aplicarPagamentos(
      c, pagamentos,
      `Removeu pagamento de R$ ${Number(alvo.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${new Date(alvo.data + "T12:00:00").toLocaleDateString("pt-BR")}`
    );
    setProcessando(false);
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    const conta = contas.find(c => c.id === id);
    await supabase.from("contas_pagar").delete().eq("id", id);
    mostrarFeedback("sucesso", "Conta removida.");
    if (conta) {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "contas_pagar",
        registro_id: id,
        descricao: `Removeu conta a pagar: ${conta.descricao} — R$ ${Number(conta.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });
    }
    setExcluindoId(null);
    carregar();
  }

  async function excluirModelo(id: string) {
    await supabase.from("contas_pagar_modelos").delete().eq("id", id);
    setModelos(prev => prev.filter(m => m.id !== id));
  }

  const totais = useMemo(() => {
    const vencidas = contas.filter(c => {
      if (c.status === "pago") return false;
      return Math.ceil((new Date(c.vencimento + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000) < 0;
    }).length;
    return {
      total:    contas.reduce((acc, c) => acc + Number(c.valor || 0), 0),
      pago:     contas.reduce((acc, c) => acc + totalPago(c), 0),
      pendente: contas.filter(c => c.status !== "pago").reduce((acc, c) => acc + restante(c), 0),
      vencidas,
    };
  }, [contas, hoje]);

  const contasFiltradas = useMemo(() => {
    if (filtro === "pago")    return contas.filter(c => c.status === "pago");
    if (filtro === "pendente") return contas.filter(c => c.status !== "pago");
    if (filtro === "vencida") return contas.filter(c => {
      if (c.status === "pago") return false;
      return Math.ceil((new Date(c.vencimento + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000) < 0;
    });
    return contas;
  }, [contas, filtro, hoje]);

  const porCategoria = useMemo(() =>
    Object.entries(
      contas.filter(c => c.status !== "pago").reduce((acc: Record<string, number>, c) => {
        acc[c.categoria] = (acc[c.categoria] || 0) + restante(c);
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]),
  [contas]);

  // pra colorir o card de cada recorrente pelo status da conta deste mês —
  // ela bate o olho e já sabe a situação, sem precisar abrir o histórico
  const contaAtualPorRecorrente = useMemo(() => {
    const map: Record<string, ContaPagar> = {};
    for (const c of contas) { if (c.recorrente_id) map[c.recorrente_id] = c; }
    return map;
  }, [contas]);
  function corCardRecorrente(recorrenteId: string) {
    const c = contaAtualPorRecorrente[recorrenteId];
    if (!c) return "border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm";
    const sv = statusVenc(c);
    if (sv === "pago") return "border border-emerald-300 bg-emerald-50/50 hover:shadow-sm";
    // atrasada precisa saltar aos olhos de longe — borda grossa e escura,
    // bem diferente do laranja fino de "perto de vencer" (fica parecido
    // demais numa olhada rápida se for só um tom mais claro de vermelho)
    if (sv === "vencida") return "border-2 border-red-600 bg-red-100 hover:shadow-sm";
    if (sv === "vence_hoje" || sv === "em_breve") return "border border-orange-300 bg-orange-50/50 hover:shadow-sm";
    return "border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm";
  }

  // "Situação do mês" — igual à planilha que a ADM já usava: só as despesas
  // FIXAS mensais (vindas de uma Despesa Recorrente), agrupadas por
  // categoria, com o status Agendado/Pago à vista — contas avulsas (não
  // recorrentes) não entram aqui, ficam só na lista normal abaixo.
  const porCategoriaCompleto = useMemo(() => {
    const grupos: Record<string, ContaPagar[]> = {};
    for (const c of contas) { if (c.recorrente_id) (grupos[c.categoria] ||= []).push(c); }
    return Object.entries(grupos)
      .map(([cat, lista]): [string, ContaPagar[], number] => [cat, lista, lista.reduce((s, c) => s + Number(c.valor), 0)])
      .sort((a, b) => b[2] - a[2]);
  }, [contas]);

  // pra mostrar "🔁 Mensal"/"🔁 Trimestral" etc. em vez de um selo genérico
  const frequenciaPorRecorrente = useMemo(() =>
    Object.fromEntries(recorrentes.map(r => [r.id, r.frequencia_meses])),
  [recorrentes]);
  function labelFrequencia(freqMeses?: number) {
    return FREQUENCIAS_RECORRENTE.find(f => f.valor === freqMeses)?.label || "automática";
  }
  function iconeCategoria(cat: string) {
    const i: Record<string, string> = {
      aluguel: "🏠", energia: "⚡", agua: "💧", internet: "🌐",
      fornecedor: "📦", salario: "💵", imposto: "🧾", outro: "📌",
    };
    return i[cat] || "📌";
  }
  function corFrequencia(freqMeses?: number) {
    const c: Record<number, string> = {
      1: "bg-violet-50 text-violet-600 border-violet-200",
      2: "bg-cyan-50 text-cyan-600 border-cyan-200",
      3: "bg-orange-50 text-orange-600 border-orange-200",
      6: "bg-teal-50 text-teal-600 border-teal-200",
      12: "bg-pink-50 text-pink-600 border-pink-200",
    };
    return c[freqMeses || 1] || c[1];
  }

  function corCategoria(cat: string) {
    const c: Record<string, string> = {
      aluguel: "bg-purple-100 text-purple-700", energia: "bg-yellow-100 text-yellow-700",
      agua: "bg-blue-100 text-blue-700", internet: "bg-cyan-100 text-cyan-700",
      fornecedor: "bg-orange-100 text-orange-700", salario: "bg-emerald-100 text-emerald-700",
      imposto: "bg-red-100 text-red-700", outro: "bg-slate-100 text-slate-700",
    };
    return c[cat] || "bg-slate-100 text-slate-700";
  }

  function estiloCard(c: ContaPagar) {
    const sv = statusVenc(c);
    if (sv === "pago")       return "border-emerald-200 bg-white";
    if (sv === "vencida")    return "border-red-300 bg-red-50";
    if (sv === "vence_hoje") return "border-orange-300 bg-orange-50";
    if (sv === "em_breve")   return "border-yellow-300 bg-yellow-50/60";
    return "border-slate-200 bg-white";
  }

  function badgeVenc(c: ContaPagar) {
    const sv = statusVenc(c);
    if (sv === "vencida")    return <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Vencida</span>;
    if (sv === "vence_hoje") return <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">Vence hoje</span>;
    if (sv === "em_breve")   return <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">Em breve</span>;
    return null;
  }

  const nPendentes = contas.filter(c => c.status !== "pago").length;
  const nPagas     = contas.filter(c => c.status === "pago").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700">Contas a Pagar</h2>
        {subaba === "contas" ? (
          <button onClick={() => { setEditandoId(null); setVencimento(vencimentoDefault()); setModalAberto(true); }}
            className="h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
            + Nova Conta
          </button>
        ) : (
          <button onClick={() => setModalRecorrenteAberto(true)}
            className="h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
            + Nova Recorrente
          </button>
        )}
      </div>

      {/* Sub-abas: Contas do mês x Despesas Recorrentes — Recorrentes é exclusivo da ADM */}
      {isAdm && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button onClick={() => setSubaba("contas")}
            className={`h-8 px-3 rounded-lg text-xs font-semibold transition ${subaba === "contas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
            Contas do mês
          </button>
          <button onClick={() => setSubaba("recorrentes")}
            className={`h-8 px-3 rounded-lg text-xs font-semibold transition ${subaba === "recorrentes" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
            🔁 Recorrentes {recorrentes.length > 0 && <span className="opacity-60">({recorrentes.length})</span>}
          </button>
        </div>
      )}

      {isAdm && subaba === "recorrentes" ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 -mt-2">Cadastre uma vez (salário de Aux. Administrativo, Agente de Limpeza, honorários de Advogado/Contadora etc.) e o sistema mesmo cria a Conta a Pagar de cada mês sozinho, avisando no sino perto do vencimento.</p>
          {recorrentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 gap-2">
              <span className="text-4xl">🔁</span>
              <p className="text-sm text-slate-400">Nenhuma despesa recorrente cadastrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {recorrentes.map(r => (
                <div key={r.id} className={`rounded-xl p-3 transition ${r.ativo ? corCardRecorrente(r.id) : "border border-slate-100 bg-slate-50 opacity-60"}`}>
                  <button onClick={() => abrirHistoricoRecorrente(r)} className="w-full text-left" title="Ver histórico completo">
                    <span className="text-base">{iconeCategoria(r.categoria)}</span>
                    <p className="font-semibold text-slate-800 text-[13px] truncate mt-1">{r.descricao}</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">R$ {Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <span className={`inline-block mt-1 text-[9.5px] font-bold px-1.5 py-px rounded-full border ${corFrequencia(r.frequencia_meses)}`}>{labelFrequencia(r.frequencia_meses)} · dia {r.dia_vencimento}</span>
                  </button>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                    <button onClick={() => alternarAtivoRecorrente(r)} title={r.ativo ? "Pausar" : "Reativar"}
                      className={`flex-1 h-6 text-[10px] font-semibold rounded-md transition ${r.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      {r.ativo ? "Ativa" : "Pausada"}
                    </button>
                    <button onClick={() => abrirEditarRecorrente(r)} title="Editar"
                      className="h-6 w-6 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition flex-shrink-0">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => excluirRecorrente(r.id)} title="Excluir"
                      className="h-6 w-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition text-base leading-none flex-shrink-0">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-800">R$ {totais.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{contas.length} {contas.length === 1 ? "conta" : "contas"} no mês</p>
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase mb-1">A Pagar</p>
          <p className="text-2xl font-bold text-red-500">R$ {totais.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          {totais.vencidas > 0 && (
            <p className="text-xs font-bold text-red-400 mt-1">{totais.vencidas} {totais.vencidas === 1 ? "conta vencida" : "contas vencidas"}</p>
          )}
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Pago</p>
          <p className="text-2xl font-bold text-emerald-600">R$ {totais.pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{nPagas} {nPagas === 1 ? "conta quitada" : "contas quitadas"}</p>
        </div>
      </div>

      {/* Breakdown por categoria (só se há pendentes) */}
      {porCategoria.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-3">Pendentes por categoria</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {porCategoria.map(([cat, val]) => (
              <div key={cat} className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${corCategoria(cat)}`}>{cat}</span>
                <span className="text-xs font-bold text-slate-600">R$ {val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Situação do mês — só despesas fixas (recorrentes), agrupadas por categoria, igual à planilha */}
      {!loading && porCategoriaCompleto.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setSituacaoAberta(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition">
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">🔁 Despesas Fixas do Mês</p>
              <p className="text-[11px] text-slate-400 mt-0.5">O que já foi pago e o que ainda falta, por categoria</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 flex-shrink-0">{situacaoAberta ? "Recolher ▲" : "Expandir ▼"}</span>
          </button>
          {situacaoAberta && (
            <div className="px-5 pb-5 space-y-5">
              {porCategoriaCompleto.map(([cat, lista, total]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                    <span className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5 capitalize">
                      <span className="text-sm">{iconeCategoria(cat)}</span>{cat}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium tabular-nums">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} no mês</span>
                  </div>
                  <div className="space-y-1.5">
                    {lista.map(c => {
                      const pago = c.status === "pago";
                      const dataRef = pago && c.pago_em ? c.pago_em : c.vencimento;
                      const freq = frequenciaPorRecorrente[c.recorrente_id!];
                      return (
                        <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 truncate">{c.descricao}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9.5px] font-bold px-1.5 py-px rounded-full border ${corFrequencia(freq)}`}>{labelFrequencia(freq)}</span>
                              <span className="text-[11px] text-slate-400">{pago ? "pago em" : "vence"} {new Date(dataRef + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${pago ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                            {pago ? "Pago" : "Agendado"}
                          </span>
                          <span className="text-[13px] font-bold text-slate-700 flex-shrink-0 w-24 text-right tabular-nums">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      {!loading && contas.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: "todas",    label: "Todas",     count: contas.length, red: false },
            { id: "pendente", label: "Pendentes", count: nPendentes,    red: false },
            { id: "vencida",  label: "Vencidas",  count: totais.vencidas, red: true },
            { id: "pago",     label: "Pagas",     count: nPagas,        red: false },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`h-8 px-3 rounded-xl text-xs font-semibold transition
                ${filtro === f.id
                  ? f.red ? "bg-red-600 text-white" : "bg-blue-900 text-white"
                  : f.red && f.count > 0
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}>
              {f.label} {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><p className="text-sm text-slate-400">Carregando...</p></div>
      ) : contasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 gap-2">
          <span className="text-4xl">📤</span>
          <p className="text-sm text-slate-400">
            {contas.length === 0 ? "Nenhuma conta registrada neste mês." : "Nenhuma conta nesta categoria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contasFiltradas.map(c => (
            <div key={c.id} className={`border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 ${estiloCard(c)}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${corCategoria(c.categoria)}`}>{c.categoria}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm truncate">{c.descricao}</p>
                    {c.recorrente_id && (
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full flex-shrink-0">🔁 {labelFrequencia(frequenciaPorRecorrente[c.recorrente_id])}</span>
                    )}
                    {badgeVenc(c)}
                  </div>
                  <p className="text-xs text-slate-400">Vencimento: {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                  {c.observacao && <p className="text-xs text-slate-400 truncate">{c.observacao}</p>}
                  {(c.pagamentos || []).length > 0 && (
                    <div className="mt-1 space-y-1">
                      {(c.pagamentos || []).map((p, i) =>
                        editandoPagamento?.contaId === c.id && editandoPagamento.index === i ? (
                          <div key={i} className="flex flex-wrap items-center gap-1.5 bg-slate-50 rounded-lg p-1.5">
                            <input type="number" min="0.01" step="0.01" value={valorPagamentoEdit}
                              onChange={e => { setValorPagamentoEdit(e.target.value); setErroPagamentoEdit(""); }}
                              className="h-7 w-24 px-2 rounded-md border border-slate-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            <input type="date" value={dataPagamentoEdit}
                              onChange={e => { setDataPagamentoEdit(e.target.value); setErroPagamentoEdit(""); }}
                              className="h-7 px-2 rounded-md border border-slate-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            <button onClick={() => salvarEdicaoPagamento(c)} disabled={processando}
                              className="h-7 px-2 text-[11px] font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-50">
                              Salvar
                            </button>
                            <button onClick={fecharEdicaoPagamento} disabled={processando}
                              className="h-7 px-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-md transition">
                              Cancelar
                            </button>
                            {erroPagamentoEdit && <p className="w-full text-[10px] text-red-500 font-semibold">{erroPagamentoEdit}</p>}
                          </div>
                        ) : (
                          <div key={i} className="flex items-center gap-1.5">
                            <p className="text-[11px] text-slate-400">
                              💳 {new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")} — R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <button onClick={() => abrirEditarPagamento(c, i)} title="Editar pagamento"
                              className="text-slate-300 hover:text-blue-600 transition">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => excluirPagamento(c, i)} disabled={processando} title="Remover pagamento"
                              className="text-slate-300 hover:text-red-500 transition disabled:opacity-40">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3 sm:flex-shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-400">Valor do serviço</p>
                    <p className="text-xs font-semibold text-slate-500">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-400">Valor pago</p>
                    <p className={`text-xs font-semibold ${totalPago(c) > 0 ? "text-red-600" : "text-slate-400"}`}>
                      {totalPago(c) > 0 ? "- " : ""}R$ {totalPago(c).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Valor restante</p>
                    <p className="font-bold text-slate-800 text-sm">
                      R$ {Math.max(restante(c), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                {c.status !== "pago" ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => abrirPagamento(c)}
                      className="h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition border border-emerald-200">
                      Pagar
                    </button>
                    <button onClick={() => abrirEditar(c)}
                      title="Editar"
                      className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => excluir(c.id)}
                      disabled={excluindoId === c.id}
                      className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-xl leading-none disabled:opacity-40">
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">Pago</span>
                    {c.pago_em && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(c.pago_em + "T12:00:00").toLocaleDateString("pt-BR")}</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* Modal registrar pagamento */}
      {pagandoId && (() => {
        const conta = contas.find(c => c.id === pagandoId);
        if (!conta) return null;
        const falta = restante(conta);
        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-24 pb-8 overflow-y-auto">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Registrar pagamento</h3>
                  <p className="text-sm text-slate-600 mt-1 font-medium">{conta.descricao}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Valor do serviço: R$ {Number(conta.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {totalPago(conta) > 0 && ` · já pago: R$ ${totalPago(conta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    {" · restam R$ "}{falta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Valor pago *</label>
                  <input
                    type="number" min="0.01" step="0.01" max={falta}
                    value={valorPagamento} onChange={e => { setValorPagamento(e.target.value); setErroPagamento(""); }}
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Data do pagamento *</label>
                  <input
                    type="date" value={dataPagamento}
                    onChange={e => { setDataPagamento(e.target.value); setErroPagamento(""); }}
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                Pra pagar menos que o total, edite o valor — o restante fica pendente na mesma conta pra pagar depois.
              </p>
              {erroPagamento && <p className="text-xs text-red-500 text-center font-semibold">{erroPagamento}</p>}

              <div className="flex gap-3">
                <button
                  onClick={fecharPagamento}
                  disabled={processando}
                  className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={() => registrarPagamento(conta)} disabled={processando}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                  {processando ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal nova conta */}
      {modalAberto && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800">{editandoId ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}</h3>

            {/* Contas salvas como atalho */}
            {!editandoId && modelos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Contas salvas — clique para preencher</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pb-1">
                  {modelos.map((m) => (
                    <div key={m.id} className="flex items-center rounded-full border border-blue-200 bg-blue-50 overflow-hidden">
                      <button type="button" onClick={() => preencherDeModelo(m)}
                        className="h-7 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition">
                        {m.descricao}
                      </button>
                      <button type="button" onClick={() => excluirModelo(m.id)}
                        className="h-7 w-6 flex items-center justify-center text-blue-300 hover:text-red-500 hover:bg-red-50 transition text-base leading-none">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 mt-3" />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Descrição *</label>
                <input
                  type="text" value={descricao}
                  onChange={e => handleDescricaoChange(e.target.value)}
                  list="sugestoes-contas"
                  placeholder="Ex: Aluguel sala, Energia elétrica..."
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <datalist id="sugestoes-contas">
                  {modelos.map((m) => <option key={m.id} value={m.descricao} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Categoria</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Valor do serviço *</label>
                  <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Vencimento *</label>
                <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Observação</label>
                <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              {/* Toggle salvar modelo */}
              {!editandoId && (
                <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
                  <div onClick={() => setSalvarModelo(v => !v)}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${salvarModelo ? "bg-blue-600" : "bg-slate-200"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${salvarModelo ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-sm text-slate-600">Salvar para usar novamente</span>
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={fecharModal}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nova/editar despesa recorrente */}
      {modalRecorrenteAberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-24 pb-8 overflow-y-auto">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">{editandoRecorrenteId ? "Editar recorrente" : "Nova despesa recorrente"}</h3>
              <button onClick={fecharModalRecorrente} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descrição</label>
                <input value={descRecorrente} onChange={e => setDescRecorrente(e.target.value)}
                  placeholder="Ex: Salário — Aux. Administrativo"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Categoria</label>
                  <select value={catRecorrente} onChange={e => setCatRecorrente(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Valor (R$)</label>
                  <input type="number" min="0.01" step="0.01" value={valorRecorrente} onChange={e => setValorRecorrente(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Frequência</label>
                  <select value={freqRecorrente} onChange={e => setFreqRecorrente(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {FREQUENCIAS_RECORRENTE.map(f => <option key={f.valor} value={f.valor}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dia do vencimento</label>
                  <input type="number" min="1" max="31" value={diaRecorrente} onChange={e => setDiaRecorrente(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Gerar quantos dias antes</label>
                  <input type="number" min="0" max="30" value={antecedenciaRecorrente} onChange={e => setAntecedenciaRecorrente(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <p className="text-xs text-slate-400">Cadastra uma vez só — a Conta a Pagar de cada mês nasce sozinha, avisando no sino.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={fecharModalRecorrente}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvarRecorrente} disabled={salvandoRecorrente}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvandoRecorrente ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal histórico completo de uma despesa recorrente — igual ao card da criança: tudo daquela despesa, num lugar só */}
      {historicoRecorrente && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-24 pb-8 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setHistoricoRecorrente(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="bg-blue-900 px-6 py-4 flex items-center justify-between sticky top-0 rounded-t-2xl">
              <div className="min-w-0">
                <h3 className="text-white font-bold truncate">{historicoRecorrente.descricao}</h3>
                <p className="text-blue-200 text-xs mt-0.5">
                  {iconeCategoria(historicoRecorrente.categoria)} {historicoRecorrente.categoria} · {labelFrequencia(historicoRecorrente.frequencia_meses)} · vence dia {historicoRecorrente.dia_vencimento}
                </p>
              </div>
              <button onClick={() => setHistoricoRecorrente(null)} className="text-blue-200 hover:text-white transition text-xl flex-shrink-0 ml-3">✕</button>
            </div>
            <div className="p-5 space-y-2">
              {carregandoHistorico ? (
                <p className="text-sm text-slate-400 text-center py-8">Carregando...</p>
              ) : historicoLista.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhuma conta gerada ainda por essa recorrente.</p>
              ) : (
                historicoLista.map(c => {
                  const pago = c.status === "pago";
                  const mesAno = new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                  return (
                    <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 capitalize">{mesAno}</p>
                          <p className="text-xs text-slate-400">
                            {pago ? `pago em ${c.pago_em ? new Date(c.pago_em + "T12:00:00").toLocaleDateString("pt-BR") : "—"}` : `vence em ${new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${pago ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {pago ? "Pago" : "Agendado"}
                        </span>
                        <span className="text-sm font-bold text-slate-700 flex-shrink-0 w-24 text-right tabular-nums">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>

                      {editandoObsId === c.id ? (
                        <div className="flex gap-1.5">
                          <input value={obsTextoHistorico} onChange={e => setObsTextoHistorico(e.target.value)} autoFocus
                            placeholder="Ex: precisou ir na agência resolver..."
                            className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                          <button onClick={() => salvarNotaHistorico(c)} className="h-8 px-2.5 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition">Salvar</button>
                          <button onClick={() => setEditandoObsId(null)} className="h-8 px-2 text-xs font-semibold text-slate-400 hover:text-slate-600">Cancelar</button>
                        </div>
                      ) : c.observacao ? (
                        <button onClick={() => abrirNotaHistorico(c)} className="w-full text-left text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-blue-200 transition">
                          📝 {c.observacao}
                        </button>
                      ) : (
                        <button onClick={() => abrirNotaHistorico(c)} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition">+ nota</button>
                      )}

                      {pagandoHistoricoId === c.id ? (
                        <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-lg p-2 border border-slate-200">
                          <input type="number" min="0.01" step="0.01" value={valorPagHistorico}
                            onChange={e => { setValorPagHistorico(e.target.value); setErroPagHistorico(""); }}
                            className="h-8 w-24 px-2 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                          <input type="date" value={dataPagHistorico}
                            onChange={e => { setDataPagHistorico(e.target.value); setErroPagHistorico(""); }}
                            className="h-8 px-2 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                          <button onClick={() => confirmarPagamentoHistorico(c)} disabled={processandoHistorico}
                            className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-50">
                            Confirmar
                          </button>
                          <button onClick={fecharPagamentoHistorico} disabled={processandoHistorico}
                            className="h-8 px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-md transition">
                            Cancelar
                          </button>
                          {erroPagHistorico && <p className="w-full text-[10px] text-red-500 font-semibold">{erroPagHistorico}</p>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {!pago && (
                            <button onClick={() => abrirPagamentoHistorico(c)}
                              className="h-8 px-3 text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition">
                              Pagar
                            </button>
                          )}
                          <button onClick={() => abrirEditar(c)}
                            className="h-8 px-3 text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-lg transition">
                            ✎ Editar valor/data
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA CONTAS A RECEBER
// =============================================
type ItemEsp = { especialidade: string; qtd: string; valor_sessao: string; unidade?: string; subtotal?: number };

function AbaContasReceber({ supabase, mesAno, mostrarFeedback }: AbaProps) {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [criancas, setCriancas] = useState<CriancaSimples[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [criancaId, setCriancaId] = useState("");
  const [mesAnoFatura, setMesAnoFatura] = useState(mesAno);
  const [especialidades, setEspecialidades] = useState<ItemEsp[]>([{ especialidade: "", qtd: "", valor_sessao: "", unidade: "sessao" }]);
  const [plano, setPlano] = useState("");
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState("");
  const [dataEnvio, setDataEnvio] = useState("");
  const [descontoISS, setDescontoISS] = useState("");
  const [descontoGlosa, setDescontoGlosa] = useState("");
  const [observacao, setObservacao] = useState("");

  type Confirmacao = { id: string; novoStatus: string; nomeLabel?: string; valor: number } | null;
  const [confirmando, setConfirmando] = useState<Confirmacao>(null);
  const [processando, setProcessando] = useState(false);
  const [dataConfirmacao, setDataConfirmacao] = useState(() => hojeLocal());

  type ExclusaoFatura = { id: string; nomeLabel?: string; valor: number } | null;
  const [excluindo, setExcluindo] = useState<ExclusaoFatura>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from("contas_receber")
      .select("*, criancas(nome)").eq("mes_referencia", mesAno).order("created_at", { ascending: false });
    setContas(data || []);
    const { data: cs } = await supabase.from("criancas").select("id, nome, plano_saude").order("nome");
    setCriancas(cs || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [mesAno]);

  const criancaSelecionada = criancas.find(c => c.id === criancaId);
  useEffect(() => {
    if (criancaSelecionada && !editandoId) setPlano(criancaSelecionada.plano_saude || "");
  }, [criancaId]);

  // No modo "crédito", Qtd é opcional — sem Qtd preenchida, o valor digitado
  // já é o subtotal da linha (Qtd conta como 1 pro cálculo).
  function qtdEfetiva(e: ItemEsp): number {
    return Number(e.qtd) || ((e.unidade || "sessao") === "credito" ? 1 : 0);
  }
  function subtotalLinha(e: ItemEsp): number {
    return qtdEfetiva(e) * (Number(e.valor_sessao) || 0);
  }

  const totalBruto = especialidades.reduce((acc, e) => acc + subtotalLinha(e), 0);
  const valorISS = Math.min(Number(descontoISS) || 0, totalBruto);
  const valorGlosa = Math.min(Number(descontoGlosa) || 0, totalBruto);
  const totalLiquido = Math.max(0, totalBruto - valorISS - valorGlosa);

  function addEspecialidade() {
    setEspecialidades(prev => [...prev, { especialidade: "", qtd: "", valor_sessao: "", unidade: "sessao" }]);
  }
  function removeEspecialidade(i: number) {
    setEspecialidades(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateEspecialidade(i: number, field: keyof ItemEsp, value: string) {
    setEspecialidades(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function resetForm() {
    setEditandoId(null);
    setCriancaId("");
    setMesAnoFatura(mesAno);
    setEspecialidades([{ especialidade: "", qtd: "", valor_sessao: "", unidade: "sessao" }]);
    setPlano(""); setNumeroNotaFiscal(""); setDataEnvio(""); setDescontoISS(""); setDescontoGlosa(""); setObservacao("");
  }

  function abrirNovo() {
    resetForm();
    setModalAberto(true);
  }

  function abrirEdicao(c: ContaReceber) {
    setEditandoId(c.id);
    setCriancaId(c.crianca_id);
    setMesAnoFatura(c.mes_referencia);
    const esps: ItemEsp[] = (c.especialidades || []).map((e: any) => ({
      especialidade: e.especialidade,
      qtd: String(e.qtd ?? ""),
      valor_sessao: String(e.valor_sessao ?? ""),
      unidade: e.unidade || "sessao",
    }));
    setEspecialidades(esps.length > 0 ? esps : [{ especialidade: "", qtd: "", valor_sessao: "", unidade: "sessao" }]);
    setPlano(c.plano_saude || "");
    setNumeroNotaFiscal(c.numero_nota_fiscal || "");
    setDataEnvio(c.data_envio || "");
    setDescontoISS(c.desconto_iss ? String(c.desconto_iss) : "");
    setDescontoGlosa(c.desconto_glosa ? String(c.desconto_glosa) : "");
    setObservacao(c.observacao || "");
    setModalAberto(true);
  }

  async function salvar() {
    if (!criancaId) { mostrarFeedback("erro", "Selecione a criança."); return; }
    if (especialidades.some(e => {
      if (!e.valor_sessao) return true;
      if ((e.unidade || "sessao") !== "credito") return !e.especialidade || !e.qtd;
      return false;
    })) {
      mostrarFeedback("erro", "Preencha ao menos o valor de cada especialidade (especialidade e quantidade são obrigatórias só quando não for crédito)."); return;
    }
    setSalvando(true);
    const espComSubtotal = especialidades.map(e => {
      const unidade = e.unidade || "sessao";
      const qtd = qtdEfetiva(e);
      return {
        especialidade: e.especialidade || (unidade === "credito" ? "Crédito" : ""),
        qtd,
        valor_sessao: Number(e.valor_sessao),
        unidade,
        subtotal: qtd * Number(e.valor_sessao),
      };
    });
    const bruto = espComSubtotal.reduce((acc, e) => acc + e.subtotal, 0);
    const iss = Math.min(Number(descontoISS) || 0, bruto);
    const glosa = Math.min(Number(descontoGlosa) || 0, bruto);
    const payload = {
      crianca_id: criancaId,
      mes_referencia: mesAnoFatura,
      especialidades: espComSubtotal,
      sessoes_realizadas: espComSubtotal.reduce((acc, e) => acc + e.qtd, 0),
      valor_sessao: 0,
      valor_total: bruto,
      valor_liquido: Math.max(0, bruto - iss - glosa),
      desconto_iss: Number(descontoISS) || 0,
      desconto_glosa: Number(descontoGlosa) || 0,
      plano_saude: plano,
      numero_nota_fiscal: numeroNotaFiscal,
      data_envio: dataEnvio || null,
      observacao,
    };

    const { data: salva, error } = editandoId
      ? await supabase.from("contas_receber").update(payload).eq("id", editandoId).select().single()
      : await supabase.from("contas_receber").insert([{ ...payload, status: "pendente" }]).select().single();

    setSalvando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else {
      mostrarFeedback("sucesso", editandoId ? "Fatura atualizada!" : "Fatura registrada!");
      const nomeCrianca = criancas.find(c => c.id === criancaId)?.nome;
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: editandoId ? "Editou" : "Criou",
        tabela: "contas_receber",
        registro_id: salva?.id,
        descricao: `${editandoId ? "Editou" : "Lançou"} fatura de ${nomeCrianca} — Ref. ${mesAnoFatura} — R$ ${(bruto - iss).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });
      setModalAberto(false);
      resetForm();
      carregar();
    }
  }

  async function confirmarAlteracao() {
    if (!confirmando) return;
    setProcessando(true);
    const update: Record<string, unknown> = { status: confirmando.novoStatus };
    if (confirmando.novoStatus === "faturado") update.faturado_em = dataConfirmacao;
    if (confirmando.novoStatus === "recebido") update.recebido_em = dataConfirmacao;
    await supabase.from("contas_receber").update(update).eq("id", confirmando.id);
    mostrarFeedback("sucesso", "Status atualizado!");
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: confirmando.novoStatus === "recebido" ? "Recebeu" : "Faturou",
      tabela: "contas_receber",
      registro_id: confirmando.id,
      descricao: `Marcou fatura de ${confirmando.nomeLabel} como ${confirmando.novoStatus} — R$ ${confirmando.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    });
    setConfirmando(null);
    setProcessando(false);
    carregar();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessandoExclusao(true);
    const { error } = await supabase.from("contas_receber").delete().eq("id", excluindo.id);
    setProcessandoExclusao(false);
    if (error) { mostrarFeedback("erro", "Erro ao excluir: " + error.message); return; }
    mostrarFeedback("sucesso", "Fatura excluída!");
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Excluiu",
      tabela: "contas_receber",
      registro_id: excluindo.id,
      descricao: `Excluiu fatura de ${excluindo.nomeLabel} — R$ ${excluindo.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    });
    setExcluindo(null);
    carregar();
  }

  const totais = useMemo(() => ({
    total: contas.reduce((acc, c) => acc + Number(c.valor_liquido ?? c.valor_total ?? 0), 0),
    recebido: contas.filter(c => c.status === "recebido").reduce((acc, c) => acc + Number(c.valor_liquido ?? c.valor_total ?? 0), 0),
    emAberto: contas.filter(c => c.status !== "recebido").length,
  }), [contas]);

  function corStatus(status: string) {
    if (status === "recebido") return "bg-emerald-100 text-emerald-700";
    if (status === "faturado") return "bg-blue-100 text-blue-700";
    return "bg-amber-100 text-amber-700";
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700">Contas a Receber</h2>
        <button onClick={abrirNovo}
          className="h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
          + Nova Fatura
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Faturado</p>
          <p className="text-2xl font-bold text-slate-800">R$ {totais.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{contas.length} {contas.length === 1 ? "fatura" : "faturas"} emitida{contas.length === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Em Aberto</p>
          <p className="text-2xl font-bold text-amber-500">{totais.emAberto}</p>
          <p className="text-xs text-amber-400 mt-1">{totais.emAberto === 1 ? "fatura aguardando" : "faturas aguardando"} pagamento</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Liquidado</p>
          <p className="text-2xl font-bold text-emerald-600">R$ {totais.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-emerald-400 mt-1">{contas.filter(c => c.status === "recebido").length} {contas.filter(c => c.status === "recebido").length === 1 ? "fatura" : "faturas"} recebida{contas.filter(c => c.status === "recebido").length === 1 ? "" : "s"}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><p className="text-sm text-slate-400">Carregando...</p></div>
      ) : contas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 gap-2">
          <span className="text-4xl">📥</span>
          <p className="text-sm text-slate-400">Nenhuma fatura registrada neste mês.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contas.map(c => {
            const esps: ItemEsp[] = c.especialidades || [];
            const valorFinal = c.valor_liquido ?? c.valor_total;
            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{c.criancas?.nome}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${corStatus(c.status)}`}>
                        {c.status === "pendente" ? "Pendente" : c.status === "faturado" ? "Faturado" : "Recebido"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Ref: {c.mes_referencia}</p>
                    {esps.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {esps.map((e, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-500">
                            <span>{e.especialidade} — {e.qtd}x R$ {Number(e.valor_sessao).toFixed(2)} ({e.unidade === "credito" ? "crédito" : "sessão"})</span>
                            <span className="font-semibold">R$ {Number(e.subtotal).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">{c.sessoes_realizadas} sessões x R$ {Number(c.valor_sessao).toFixed(2)}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {c.plano_saude && <p className="text-xs text-slate-400">Plano: {c.plano_saude}</p>}
                      {c.numero_nota_fiscal && <p className="text-xs text-slate-400">NF: {c.numero_nota_fiscal}</p>}
                      {c.data_envio && <p className="text-xs text-slate-400">Envio: {new Date(c.data_envio + "T12:00:00").toLocaleDateString("pt-BR")}</p>}
                      {c.faturado_em && <p className="text-xs text-blue-500">Faturado em: {new Date(c.faturado_em + "T12:00:00").toLocaleDateString("pt-BR")}</p>}
                      {c.recebido_em && <p className="text-xs text-emerald-600 font-medium">Recebido em: {new Date(c.recebido_em + "T12:00:00").toLocaleDateString("pt-BR")}</p>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {((c.desconto_iss || 0) > 0 || (c.desconto_glosa || 0) > 0) && (
                      <>
                        <p className="text-xs text-slate-400 line-through">R$ {Number(c.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        {(c.desconto_iss || 0) > 0 && (
                          <p className="text-xs text-red-400">ISS -R$ {Number(c.desconto_iss).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        )}
                        {(c.desconto_glosa || 0) > 0 && (
                          <p className="text-xs text-red-400">Glosa -R$ {Number(c.desconto_glosa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        )}
                      </>
                    )}
                    <p className="font-bold text-slate-800">R$ {Number(valorFinal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirEdicao(c)}
                    className="h-8 px-3 text-xs font-semibold bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition border border-slate-200">
                    Editar
                  </button>
                  {c.status !== "recebido" && (
                    <>
                      {c.status === "pendente" && (
                        <button
                          onClick={() => { setDataConfirmacao(hojeLocal()); setConfirmando({ id: c.id, novoStatus: "faturado", nomeLabel: c.criancas?.nome, valor: Number(valorFinal) }); }}
                          className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200">
                          Marcar Faturado
                        </button>
                      )}
                      <button
                        onClick={() => { setDataConfirmacao(hojeLocal()); setConfirmando({ id: c.id, novoStatus: "recebido", nomeLabel: c.criancas?.nome, valor: Number(valorFinal) }); }}
                        className="h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition border border-emerald-200">
                        Marcar Recebido
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExcluindo({ id: c.id, nomeLabel: c.criancas?.nome, valor: Number(valorFinal) })}
                    className="h-8 px-3 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-200 ml-auto flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-24 pb-8 overflow-y-auto">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${confirmando.novoStatus === "recebido" ? "bg-emerald-50" : "bg-blue-50"}`}>
                <Check className={`h-8 w-8 ${confirmando.novoStatus === "recebido" ? "text-emerald-500" : "text-blue-500"}`} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {confirmando.novoStatus === "recebido" ? "Marcar como recebido?" : "Marcar como faturado?"}
                </h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">{confirmando.nomeLabel}</p>
                <p className={`text-xl font-bold mt-1 ${confirmando.novoStatus === "recebido" ? "text-emerald-700" : "text-blue-700"}`}>
                  R$ {confirmando.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Data {confirmando.novoStatus === "recebido" ? "do recebimento" : "do faturamento"}
              </label>
              <input type="date" value={dataConfirmacao} onChange={e => setDataConfirmacao(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmando(null)} disabled={processando}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={confirmarAlteracao} disabled={processando}
                className={`flex-1 h-11 rounded-xl text-white text-sm font-bold transition disabled:opacity-50 ${confirmando.novoStatus === "recebido" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                {processando ? "Salvando..." : "Sim, confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {excluindo && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-24 pb-8 overflow-y-auto">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-50">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Excluir fatura?</h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">{excluindo.nomeLabel}</p>
                <p className="text-xl font-bold mt-1 text-red-600">
                  R$ {excluindo.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExcluindo(null)} disabled={processandoExclusao}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={confirmarExclusao} disabled={processandoExclusao}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition disabled:opacity-50">
                {processandoExclusao ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) { setModalAberto(false); resetForm(); } }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-lg">{editandoId ? "Editar Fatura" : "Nova Fatura"}</h3>
            <div className="space-y-4">

              {/* Criança + Mês */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Criança *</label>
                  <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Mês de Referência</label>
                  <div className="mt-1 flex gap-2">
                    <select value={Number(mesAnoFatura.split("-")[1])}
                      onChange={e => setMesAnoFatura(`${mesAnoFatura.split("-")[0]}-${e.target.value.padStart(2, "0")}`)}
                      className="flex-[2] h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={mesAnoFatura.split("-")[0]}
                      onChange={e => setMesAnoFatura(`${e.target.value}-${mesAnoFatura.split("-")[1]}`)}
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {anosDisponiveis().map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Especialidades */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Especialidades *</label>
                  <button type="button" onClick={addEspecialidade}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition">
                    + Adicionar
                  </button>
                </div>
                <div className="space-y-3 sm:space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-1 text-xs text-slate-400 px-1">
                    <span className="col-span-4">Especialidade</span>
                    <span className="col-span-2 text-center">Qtd</span>
                    <span className="col-span-3">Unidade</span>
                    <span className="col-span-2">Valor (R$)</span>
                  </div>
                  {especialidades.map((e, i) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-1 sm:items-center border border-slate-100 sm:border-0 rounded-xl sm:rounded-none p-2 sm:p-0">
                      <div className="col-span-2 sm:col-span-4">
                        <label className="text-[10px] text-slate-400 sm:hidden">Especialidade</label>
                        <select value={e.especialidade}
                          onChange={ev => updateEspecialidade(i, "especialidade", ev.target.value)}
                          className="w-full h-9 px-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Selecione...</option>
                          <option value="ABA">ABA</option>
                          <option value="Artes">Artes</option>
                          <option value="Capoeira">Capoeira</option>
                          <option value="Fisioterapia">Fisioterapia</option>
                          <option value="Fonoaudiologia">Fonoaudiologia</option>
                          <option value="Pedagoga">Pedagoga</option>
                          <option value="Psicologia">Psicologia</option>
                          <option value="Psicopedagogia">Psicopedagogia</option>
                          <option value="Psicomotricidade">Psicomotricidade</option>
                          <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                        </select>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 sm:hidden">Qtd</label>
                        <input type="number" min="0" value={e.qtd}
                          onChange={ev => updateEspecialidade(i, "qtd", ev.target.value)}
                          placeholder="0"
                          className="w-full h-9 px-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"/>
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <label className="text-[10px] text-slate-400 sm:hidden">Unidade</label>
                        <select value={e.unidade || "sessao"}
                          onChange={ev => updateEspecialidade(i, "unidade", ev.target.value)}
                          className="w-full h-9 px-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="sessao">Sessão</option>
                          <option value="credito">Crédito</option>
                        </select>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 sm:hidden">Valor (R$)</label>
                        <input type="number" min="0" value={e.valor_sessao}
                          onChange={ev => updateEspecialidade(i, "valor_sessao", ev.target.value)}
                          placeholder="0,00"
                          className="w-full h-9 px-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div className="col-span-1 sm:col-span-1 flex items-end sm:items-center justify-center">
                        {especialidades.length > 1 && (
                          <button type="button" onClick={() => removeEspecialidade(i)}
                            className="h-8 w-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-lg leading-none">
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {especialidades.some(e => e.valor_sessao) && (
                  <div className="mt-2 space-y-1 px-1">
                    {especialidades.map((e, i) => {
                      const sub = subtotalLinha(e);
                      if (!sub) return null;
                      return (
                        <div key={i} className="flex justify-between text-xs text-slate-400">
                          <span>{e.especialidade || `Especialidade ${i + 1}`}</span>
                          <span>R$ {sub.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Descontos: ISS + Glosa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Desconto ISS (R$)</label>
                  <input type="number" min="0" step="0.01" value={descontoISS}
                    onChange={e => setDescontoISS(e.target.value)} placeholder="Ex: 900,00"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Desconto Glosa (R$)</label>
                  <input type="number" min="0" step="0.01" value={descontoGlosa}
                    onChange={e => setDescontoGlosa(e.target.value)} placeholder="Ex: 200,00"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {/* Resumo financeiro */}
              {totalBruto > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total bruto</span>
                    <span className="font-semibold text-slate-700">R$ {totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {valorISS > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-400">Desconto ISS</span>
                      <span className="font-semibold text-red-400">− R$ {valorISS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {valorGlosa > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-400">Desconto Glosa</span>
                      <span className="font-semibold text-red-400">− R$ {valorGlosa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                    <span className="text-blue-900">Total a receber</span>
                    <span className="text-blue-900">R$ {totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Plano + NF */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Plano de Saúde</label>
                  <input type="text" value={plano} onChange={e => setPlano(e.target.value)} placeholder="Ex: Unimed"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nº Nota Fiscal</label>
                  <input type="text" value={numeroNotaFiscal} onChange={e => setNumeroNotaFiscal(e.target.value)} placeholder="Ex: 000123"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {/* Data de Envio + Observação */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Data de Envio</label>
                  <input type="date" value={dataEnvio} onChange={e => setDataEnvio(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Observação</label>
                  <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModalAberto(false); resetForm(); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA FLUXO DE CAIXA
// =============================================
function AbaFluxo({ supabase, mesAno }: AbaFluxoProps) {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState({
    entradas: 0, saidasContas: 0, saidasFolha: 0,
    receberPlano: 0, pagarContas: 0, pagarFolha: 0,
  });
  const [saldoAnterior, setSaldoAnterior] = useState<number | null>(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const [ano, mes] = mesAno.split("-");
      const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
      const ini = `${ano}-${mes}-01`;
      const fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

      // mês anterior
      const prevD   = new Date(Number(ano), Number(mes) - 2, 1);
      const prevMes = String(prevD.getMonth() + 1).padStart(2, "0");
      const prevAno = String(prevD.getFullYear());
      const prevMesAno  = `${prevAno}-${prevMes}`;
      const prevUltimo  = new Date(prevD.getFullYear(), prevD.getMonth() + 1, 0).getDate();
      const prevIni = `${prevAno}-${prevMes}-01`;
      const prevFim = `${prevAno}-${prevMes}-${String(prevUltimo).padStart(2, "0")}`;

      const [
        { data: recebidos },
        { data: pagos },
        { data: folhaPaga },
        { data: aReceber },
        { data: aPagar },
        { data: folhaPendente },
        { data: prevRecebidos },
        { data: prevPagos },
        { data: prevFolhaPaga },
      ] = await Promise.all([
        supabase.from("contas_receber").select("valor_liquido,valor_total").eq("mes_referencia", mesAno).eq("status", "recebido"),
        supabase.from("contas_pagar").select("valor").eq("status", "pago").gte("vencimento", ini).lte("vencimento", fim),
        supabase.from("folha_pagamento").select("valor_final").eq("mes", Number(mes)).eq("ano", Number(ano)).eq("status", "pago"),
        supabase.from("contas_receber").select("valor_liquido,valor_total").eq("mes_referencia", mesAno).neq("status", "recebido"),
        supabase.from("contas_pagar").select("valor").neq("status", "pago").gte("vencimento", ini).lte("vencimento", fim),
        supabase.from("folha_pagamento").select("valor_final").eq("mes", Number(mes)).eq("ano", Number(ano)).eq("status", "pendente"),
        supabase.from("contas_receber").select("valor_liquido,valor_total").eq("mes_referencia", prevMesAno).eq("status", "recebido"),
        supabase.from("contas_pagar").select("valor").eq("status", "pago").gte("vencimento", prevIni).lte("vencimento", prevFim),
        supabase.from("folha_pagamento").select("valor_final").eq("mes", prevD.getMonth() + 1).eq("ano", prevD.getFullYear()).eq("status", "pago"),
      ]);

      const sumLiq = (arr: Record<string, unknown>[]) => (arr || []).reduce((acc: number, r) =>
        acc + Number(r.valor_liquido ?? r.valor_total ?? 0), 0);
      const sumK = (arr: Record<string, unknown>[], k: string) => (arr || []).reduce((acc: number, r) => acc + Number(r[k] || 0), 0);

      setD({
        entradas:     sumLiq(recebidos),
        saidasContas: sumK(pagos, "valor"),
        saidasFolha:  sumK(folhaPaga, "valor_final"),
        receberPlano: sumLiq(aReceber),
        pagarContas:  sumK(aPagar, "valor"),
        pagarFolha:   sumK(folhaPendente, "valor_final"),
      });
      setSaldoAnterior(sumLiq(prevRecebidos) - sumK(prevPagos, "valor") - sumK(prevFolhaPaga, "valor_final"));
      setLoading(false);
    }
    carregar();
  }, [mesAno]);

  const saidas           = d.saidasContas + d.saidasFolha;
  const pagar            = d.pagarContas  + d.pagarFolha;
  const saldo            = d.entradas - saidas;
  const receitaTotal     = d.entradas + d.receberPlano;
  const despesaTotal     = saidas + pagar;
  const saldoProj        = receitaTotal - despesaTotal;
  const pctRecebido      = receitaTotal > 0 ? Math.round((d.entradas / receitaTotal) * 100) : 0;
  const pctComprometido  = receitaTotal > 0 ? Math.round((despesaTotal / receitaTotal) * 100) : 0;
  const totalSaidas      = despesaTotal > 0 ? despesaTotal : 1;
  const pctContas        = Math.round(((d.saidasContas + d.pagarContas) / totalSaidas) * 100);
  const pctFolha         = Math.round(((d.saidasFolha  + d.pagarFolha)  / totalSaidas) * 100);
  const difAnterior      = saldoAnterior !== null ? saldo - saldoAnterior : null;

  const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  if (loading) return <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-400">Carregando...</p></div>;

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-slate-700">Fluxo de Caixa</h2>

      {/* Saldo realizado */}
      <div className={`rounded-2xl p-6 text-center shadow-sm ${saldo >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
        <p className="text-xs font-bold uppercase tracking-wide mb-1 text-slate-500">Saldo Realizado</p>
        <p className={`text-4xl font-bold ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {saldo < 0 && "− "}R$ {brl(Math.abs(saldo))}
        </p>
        <p className="text-xs text-slate-400 mt-2">Entradas já recebidas menos saídas já pagas</p>
        {difAnterior !== null && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-slate-400">
              Mês anterior: {saldoAnterior! < 0 && "− "}R$ {brl(Math.abs(saldoAnterior!))}
            </span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${difAnterior >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
              {difAnterior >= 0 ? "▲" : "▼"} R$ {brl(Math.abs(difAnterior))}
            </span>
          </div>
        )}
      </div>

      {/* 4 cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Entradas Realizadas</p>
          <p className="text-2xl font-bold text-emerald-600">R$ {brl(d.entradas)}</p>
          {receitaTotal > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>{pctRecebido}% da receita prevista recebida</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pctRecebido}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase mb-1">Saídas Realizadas</p>
          <p className="text-2xl font-bold text-red-500">R$ {brl(saidas)}</p>
          {saidas > 0 && (
            <div className="mt-2 space-y-0.5">
              <p className="text-[10px] text-slate-400">Contas: R$ {brl(d.saidasContas)}</p>
              <p className="text-[10px] text-slate-400">Folha: R$ {brl(d.saidasFolha)}</p>
            </div>
          )}
        </div>
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">A Receber</p>
          <p className="text-2xl font-bold text-blue-600">R$ {brl(d.receberPlano)}</p>
          <p className="text-xs text-slate-400 mt-1">Faturas pendentes do plano</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase mb-1">A Pagar</p>
          <p className="text-2xl font-bold text-amber-500">R$ {brl(pagar)}</p>
          {pagar > 0 && (
            <div className="mt-2 space-y-0.5">
              <p className="text-[10px] text-slate-400">Contas: R$ {brl(d.pagarContas)}</p>
              <p className="text-[10px] text-slate-400">Folha: R$ {brl(d.pagarFolha)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerta despesas > receita */}
      {despesaTotal > receitaTotal && receitaTotal > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-bold text-red-700 text-sm">Despesas superam a receita prevista</p>
            <p className="text-xs text-red-500 mt-0.5">
              Déficit projetado de R$ {brl(despesaTotal - receitaTotal)}. Revise as contas a pagar ou a folha de pagamento.
            </p>
          </div>
        </div>
      )}

      {/* Composição das despesas */}
      {despesaTotal > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-700 text-sm">Composição das Despesas</h3>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Contas fixas</span>
                <span className="font-semibold text-slate-700">R$ {brl(d.saidasContas + d.pagarContas)} <span className="text-slate-400 font-normal">({pctContas}%)</span></span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pctContas}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Folha de pagamento</span>
                <span className="font-semibold text-slate-700">R$ {brl(d.saidasFolha + d.pagarFolha)} <span className="text-slate-400 font-normal">({pctFolha}%)</span></span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pctFolha}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projeção */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-700 text-sm">Resultado Projetado do Mês</h3>
        <p className="text-xs text-slate-400 -mt-1">Considera tudo realizado + pendente</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Receita total prevista</span>
            <span className="font-semibold text-emerald-600">+ R$ {brl(receitaTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Despesa total prevista</span>
            <span className="font-semibold text-red-500">− R$ {brl(despesaTotal)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-bold">
            <span className="text-slate-700">Resultado projetado</span>
            <span className={saldoProj >= 0 ? "text-emerald-600" : "text-red-600"}>
              {saldoProj < 0 && "− "}R$ {brl(Math.abs(saldoProj))}
            </span>
          </div>
          {receitaTotal > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Receita comprometida com despesas</span>
              <span className={`text-sm font-bold ${pctComprometido > 100 ? "text-red-600" : pctComprometido > 85 ? "text-amber-600" : "text-emerald-600"}`}>
                {pctComprometido}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// ABA EMPRÉSTIMOS
// =============================================
function AbaEmprestimos({ supabase, mostrarFeedback }: AbaSemMesProps) {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"ativos" | "quitados" | "todos">("ativos");

  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [colaboradorNome, setColaboradorNome] = useState("");
  const [colaboradorCpf, setColaboradorCpf] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [dataEmprestimo, setDataEmprestimo] = useState(() => hojeLocal());
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [observacao, setObservacao] = useState("");

  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [numeroParcelaPagamento, setNumeroParcelaPagamento] = useState("1");
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [registrandoId, setRegistrandoId] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [historicoCompleto, setHistoricoCompleto] = useState<Set<string>>(new Set());

  async function carregar() {
    setLoading(true);
    const [{ data: emp }, { data: ats }, { data: internas }] = await Promise.all([
      supabase.from("emprestimos_colaboradores").select("*").order("created_at", { ascending: false }),
      supabase.from("atendentes").select("nome, cpf").order("nome"),
      supabase.from("colaboradoras_internas").select("nome, cpf").eq("ativo", true).order("nome"),
    ]);
    setEmprestimos(emp || []);
    const nomes = [
      ...((ats || []).map((a: { nome: string; cpf: string | null }) => ({ nome: a.nome, cpf: a.cpf }))),
      ...((internas || []).map((c: { nome: string; cpf: string | null }) => ({ nome: c.nome, cpf: c.cpf }))),
    ].sort((a, b) => a.nome.localeCompare(b.nome));
    const vistos = new Set<string>();
    setColaboradores(nomes.filter(c => (vistos.has(c.nome) ? false : (vistos.add(c.nome), true))));
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function resetForm() {
    setColaboradorNome(""); setColaboradorCpf(""); setValorTotal(""); setDataEmprestimo(hojeLocal());
    setNumeroParcelas("1"); setObservacao("");
  }

  function selecionarColaborador(nome: string) {
    setColaboradorNome(nome);
    setColaboradorCpf(colaboradores.find(c => c.nome === nome)?.cpf || "");
  }

  const valorParcelaPreview = (Number(valorTotal) || 0) / (Number(numeroParcelas) || 1);

  async function salvar() {
    if (!colaboradorNome) { mostrarFeedback("erro", "Selecione o colaborador."); return; }
    const total = Number(valorTotal);
    const parcelas = Number(numeroParcelas);
    if (!total || total <= 0) { mostrarFeedback("erro", "Informe o valor do empréstimo."); return; }
    if (!parcelas || parcelas <= 0) { mostrarFeedback("erro", "Informe o número de parcelas."); return; }

    setSalvando(true);
    const valorParcela = Math.round((total / parcelas) * 100) / 100;
    const { data: novo, error } = await supabase.from("emprestimos_colaboradores").insert([{
      colaborador_nome: colaboradorNome,
      colaborador_cpf: colaboradorCpf || null,
      valor_total: total,
      data_emprestimo: dataEmprestimo,
      numero_parcelas: parcelas,
      valor_parcela: valorParcela,
      pagamentos: [],
      status: "ativo",
      observacao: observacao || null,
    }]).select().single();
    setSalvando(false);

    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else {
      mostrarFeedback("sucesso", "Empréstimo registrado!");
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Criou",
        tabela: "emprestimos_colaboradores",
        registro_id: novo?.id,
        descricao: `Registrou empréstimo de R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para ${colaboradorNome} em ${parcelas}x`,
      });
      setModalAberto(false);
      resetForm();
      carregar();
    }
  }

  function totalPago(emp: Emprestimo) {
    return (emp.pagamentos || []).reduce((acc, p) => acc + Number(p.valor || 0), 0);
  }
  function restante(emp: Emprestimo) {
    return Number(emp.valor_total) - totalPago(emp);
  }
  function parcelasEquivalentes(emp: Emprestimo) {
    return Math.min(Math.round((totalPago(emp) / Number(emp.valor_parcela)) * 100) / 100, emp.numero_parcelas);
  }

  function proximaDataSugerida(emp: Emprestimo) {
    const [ano, mes, dia] = emp.data_emprestimo.split("-").map(Number);
    const d = new Date(ano, mes - 1, dia);
    d.setMonth(d.getMonth() + (emp.pagamentos?.length || 0) + 1);
    return d.toISOString().slice(0, 10);
  }

  function abrirPagamento(emp: Emprestimo) {
    const sugestao = Math.min(Number(emp.valor_parcela), restante(emp));
    setValorPagamento(sugestao > 0 ? sugestao.toFixed(2) : "");
    setDataPagamento(proximaDataSugerida(emp));
    setNumeroParcelaPagamento(String((emp.pagamentos?.length || 0) + 1));
    setComprovanteFile(null);
    setPagandoId(emp.id);
  }

  async function uploadComprovante(file: File, emprestimoId: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${emprestimoId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("emprestimos-arquivos").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("emprestimos-arquivos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function registrarPagamento(emp: Emprestimo) {
    const valor = Number(valorPagamento);
    if (!valor || valor <= 0) { mostrarFeedback("erro", "Informe o valor pago."); return; }
    if (!dataPagamento) { mostrarFeedback("erro", "Informe a data do pagamento."); return; }

    setRegistrandoId(emp.id);
    let comprovante_url: string | null = null;
    if (comprovanteFile) {
      comprovante_url = await uploadComprovante(comprovanteFile, emp.id);
      if (!comprovante_url) { mostrarFeedback("erro", "Erro ao enviar o comprovante — pagamento não registrado."); setRegistrandoId(null); return; }
    }
    const novosPagamentos = [...(emp.pagamentos || []), {
      data: dataPagamento,
      valor,
      numero_parcela: Number(numeroParcelaPagamento) || (emp.pagamentos?.length || 0) + 1,
      comprovante_url,
    }];
    const novoTotalPago = novosPagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const novoStatus = novoTotalPago >= Number(emp.valor_total) - 0.01 ? "quitado" : "ativo";
    const { error } = await supabase.from("emprestimos_colaboradores").update({
      pagamentos: novosPagamentos,
      status: novoStatus,
    }).eq("id", emp.id);
    setRegistrandoId(null);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else {
      mostrarFeedback("sucesso", novoStatus === "quitado" ? "Empréstimo quitado!" : "Pagamento registrado!");
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Registrou pagamento",
        tabela: "emprestimos_colaboradores",
        registro_id: emp.id,
        descricao: `Registrou pagamento de R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} do empréstimo de ${emp.colaborador_nome}`,
      });
      setPagandoId(null);
      setValorPagamento("");
      setComprovanteFile(null);
      carregar();
    }
  }

  function gerarRecibo(emp: Emprestimo, pagamento: Pagamento) {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (v: string | null | undefined) => (v ?? "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const logoUrl = `${window.location.origin}/logo.png`;
    const dataPix = new Date(pagamento.data + "T12:00:00");
    const dataExtenso = dataPix.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const mesReferencia = dataPix.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const hoje = new Date().toLocaleDateString("pt-BR");
    const numeroParcela = pagamento.numero_parcela ?? "?";
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Recibo — ${esc(emp.colaborador_nome)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #1e293b; padding: 60px 70px; max-width: 720px; margin: auto; line-height: 1.7; }
        .logo { display: block; width: 90px; height: 90px; object-fit: contain; margin: 0 auto 24px; }
        .titulo { text-align: center; font-style: italic; font-size: 16px; font-weight: bold; margin-bottom: 40px; }
        p { text-align: center; margin-bottom: 18px; }
        [contenteditable="true"] { outline: none; }
        [contenteditable="true"]:hover { background: #fffbe6; }
        .assinatura { margin-top: 60px; text-align: center; }
        .assinatura p { margin-bottom: 4px; }
        .barra { max-width: 720px; margin: 0 auto 24px; text-align: center; }
        .barra button { font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 10px 20px; border-radius: 8px; border: none; background: #1e3a5f; color: white; cursor: pointer; }
        .dica { font-family: Arial, sans-serif; font-size: 11px; color: #64748b; text-align: center; margin-bottom: 20px; }
        @media print { .barra, .dica { display: none; } body { padding: 40px; } }
      </style>
    </head><body>
      <div class="barra"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
      <p class="dica">Clique em qualquer texto abaixo pra editar antes de imprimir.</p>
      <img class="logo" src="${logoUrl}" alt="Clínica Abraço"/>
      <p class="titulo" contenteditable="true">RECIBO DE PAGAMENTO</p>
      <p contenteditable="true">Recebi de ${esc(emp.colaborador_nome)}, CPF nº ${esc(emp.colaborador_cpf) || "___________________"}, a quantia de
      R$ ${Number(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} referente à ${numeroParcela}ª parcela do
      empréstimo no valor total de R$ ${Number(emp.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, conforme acordo firmado com a Clínica Abraço.</p>
      <p contenteditable="true">O pagamento foi realizado na data de ${dataExtenso}, correspondendo ao mês de ${mesReferencia}.</p>
      <p contenteditable="true">Forma de pagamento: através de link concedido pela Clínica</p>
      <div class="assinatura">
        <p contenteditable="true">Clínica Abraço</p>
        <p contenteditable="true">CNPJ: 34.864.312/0001-65</p>
        <p contenteditable="true">Responsável: Solange Oliveira Reis</p>
        <p contenteditable="true">Data: ${hoje}</p>
      </div>
    </body></html>`);
    w.document.close();
  }

  const filtrados = emprestimos.filter(e => {
    if (filtro === "ativos") return e.status === "ativo";
    if (filtro === "quitados") return e.status === "quitado";
    return true;
  });

  const totais = useMemo(() => ({
    emprestado: emprestimos.reduce((acc, e) => acc + Number(e.valor_total || 0), 0),
    emAberto: emprestimos.filter(e => e.status === "ativo").reduce((acc, e) => acc + restante(e), 0),
    quitado: emprestimos.filter(e => e.status === "quitado").reduce((acc, e) => acc + Number(e.valor_total || 0), 0),
  }), [emprestimos]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700">Empréstimos</h2>
        <button onClick={() => { resetForm(); setModalAberto(true); }}
          className="h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
          + Novo Empréstimo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Emprestado</p>
          <p className="text-2xl font-bold text-slate-800">R$ {totais.emprestado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{emprestimos.length} empréstimo{emprestimos.length === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Em Aberto</p>
          <p className="text-2xl font-bold text-amber-500">R$ {totais.emAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-amber-400 mt-1">{emprestimos.filter(e => e.status === "ativo").length} ativo{emprestimos.filter(e => e.status === "ativo").length === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Quitado</p>
          <p className="text-2xl font-bold text-emerald-600">R$ {totais.quitado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-emerald-400 mt-1">{emprestimos.filter(e => e.status === "quitado").length} quitado{emprestimos.filter(e => e.status === "quitado").length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {[
          { key: "ativos", label: "Ativos", icon: "⏳" },
          { key: "quitados", label: "Quitados", icon: "✅" },
          { key: "todos", label: "Todos", icon: "📋" },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filtro === f.key ? "bg-blue-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><p className="text-sm text-slate-400">Carregando...</p></div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 gap-2">
          <span className="text-4xl">🤝</span>
          <p className="text-sm text-slate-400">Nenhum empréstimo {filtro === "ativos" ? "ativo" : filtro === "quitados" ? "quitado" : "registrado"}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(e => {
            const falta = restante(e);
            const aberto = expandido === e.id;
            const pagamentos = e.pagamentos || [];
            return (
              <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpandido(aberto ? null : e.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{e.colaborador_nome}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.status === "quitado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {e.status === "quitado" ? "Quitado" : "Ativo"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Emprestado em {new Date(e.data_emprestimo + "T12:00:00").toLocaleDateString("pt-BR")} · parcela de referência: R$ {Number(e.valor_parcela).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({e.numero_parcelas}x)
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      ≈ {parcelasEquivalentes(e)}/{e.numero_parcelas} parcelas pagas (por valor)
                    </p>
                    {e.observacao && <p className="text-xs text-slate-400 mt-1">{e.observacao}</p>}
                    {aberto && pagamentos.length > 0 && (() => {
                      const verTudo = historicoCompleto.has(e.id);
                      const invertidos = [...pagamentos].reverse();
                      const visiveis = verTudo ? invertidos : invertidos.slice(0, 5);
                      return (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 max-w-md">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Pagamentos registrados ({pagamentos.length})</p>
                          {visiveis.map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                              <span className="shrink-0">
                                {new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}
                                {p.numero_parcela ? ` · ${p.numero_parcela}ª` : ""}
                              </span>
                              <span className="font-semibold shrink-0">R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              <div className="flex items-center gap-2 shrink-0" onClick={ev => ev.stopPropagation()}>
                                {p.comprovante_url && (
                                  <a href={p.comprovante_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition">
                                    Comprovante
                                  </a>
                                )}
                                <button onClick={() => gerarRecibo(e, p)}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition">
                                  Gerar recibo
                                </button>
                              </div>
                            </div>
                          ))}
                          {pagamentos.length > 5 && (
                            <button
                              onClick={ev => {
                                ev.stopPropagation();
                                setHistoricoCompleto(prev => {
                                  const novo = new Set(prev);
                                  verTudo ? novo.delete(e.id) : novo.add(e.id);
                                  return novo;
                                });
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition pt-1">
                              {verTudo ? "Mostrar menos" : `Ver todos (${pagamentos.length})`}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Valor total</p>
                    <p className="font-bold text-slate-800">R$ {Number(e.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-amber-600 mt-1">Falta R$ {Math.max(falta, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                {e.status === "ativo" && (
                  pagandoId === e.id ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Valor</label>
                        <input type="number" min="0" step="0.01" value={valorPagamento}
                          onChange={ev => setValorPagamento(ev.target.value)} placeholder="0,00" autoFocus
                          className="h-8 w-28 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Data (mês de referência)</label>
                        <input type="date" value={dataPagamento}
                          onChange={ev => setDataPagamento(ev.target.value)}
                          className="h-8 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Parcela nº</label>
                        <input type="number" min="1" value={numeroParcelaPagamento}
                          onChange={ev => setNumeroParcelaPagamento(ev.target.value)}
                          className="h-8 w-16 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Comprovante (opcional)</label>
                        <input type="file" accept="image/*,.pdf"
                          onChange={ev => setComprovanteFile(ev.target.files?.[0] || null)}
                          className="text-xs text-slate-500 file:mr-2 file:h-8 file:px-2 file:rounded-lg file:border-0 file:bg-slate-100 file:text-xs file:font-semibold file:text-slate-600 hover:file:bg-slate-200"/>
                      </div>
                      <button
                        onClick={() => registrarPagamento(e)}
                        disabled={registrandoId === e.id}
                        className="h-8 px-3 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 self-end">
                        {registrandoId === e.id ? "Salvando..." : "Confirmar"}
                      </button>
                      <button onClick={() => { setPagandoId(null); setValorPagamento(""); setComprovanteFile(null); }}
                        className="h-8 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition self-end">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirPagamento(e)}
                        className="h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition border border-emerald-200">
                        Registrar pagamento
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
          onClick={ev => { if (ev.target === ev.currentTarget) { setModalAberto(false); resetForm(); } }}>
          <div className="w-full sm:max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-lg">Novo Empréstimo</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Colaborador *</label>
                <select value={colaboradorNome} onChange={e => selecionarColaborador(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {colaboradores.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">CPF</label>
                <input type="text" value={colaboradorCpf} onChange={e => setColaboradorCpf(e.target.value)} placeholder="000.000.000-00"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Valor total (R$) *</label>
                  <input type="number" min="0" step="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="0,00"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nº de parcelas *</label>
                  <input type="number" min="1" value={numeroParcelas} onChange={e => setNumeroParcelas(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Data do empréstimo</label>
                <input type="date" value={dataEmprestimo} onChange={e => setDataEmprestimo(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              {valorParcelaPreview > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between text-sm">
                  <span className="text-slate-500">Valor de cada parcela</span>
                  <span className="font-bold text-blue-900">R$ {valorParcelaPreview.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Observação</label>
                <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModalAberto(false); resetForm(); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}