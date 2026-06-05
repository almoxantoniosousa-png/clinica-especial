"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { Check } from "lucide-react";

type Aba = "contas_pagar" | "contas_receber" | "fluxo";

export default function FinanceiroPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("contas_pagar");
  const [mesAno, setMesAno] = useState(() => new Date().toISOString().slice(0, 7));
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  const mesFormatado = new Date(mesAno + "-15").toLocaleDateString("pt-BR", {
    month: "long", year: "numeric",
  });

  const abas = [
    { id: "contas_pagar",   label: "Contas a Pagar",  icon: "📤" },
    { id: "contas_receber", label: "Contas a Receber", icon: "📥" },
    { id: "fluxo",          label: "Fluxo de Caixa",  icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">Financeiro</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{mesFormatado}</p>
        </div>
        <input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-auto"/>
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
      {aba === "contas_pagar"   && <AbaContasPagar   supabase={supabase} mesAno={mesAno} mostrarFeedback={mostrarFeedback}/>}
      {aba === "contas_receber" && <AbaContasReceber supabase={supabase} mesAno={mesAno} mostrarFeedback={mostrarFeedback}/>}
      {aba === "fluxo"          && <AbaFluxo         supabase={supabase} mesAno={mesAno}/>}
    </div>
  );
}

// =============================================
// ABA CONTAS A PAGAR
// =============================================
function AbaContasPagar({ supabase, mesAno, mostrarFeedback }: any) {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("aluguel");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacao, setObservacao] = useState("");

  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [confirmandoDescricao, setConfirmandoDescricao] = useState("");
  const [confirmandoValor, setConfirmandoValor] = useState(0);
  const [processando, setProcessando] = useState(false);

  const categorias = ["aluguel","energia","agua","internet","fornecedor","salario","imposto","outro"];

  const carregar = async () => {
    setLoading(true);
    const [ano, mes] = mesAno.split("-");
    const { data } = await supabase.from("contas_pagar")
      .select("*")
      .gte("vencimento", `${ano}-${mes}-01`)
      .lte("vencimento", `${ano}-${mes}-31`)
      .order("vencimento");
    setContas(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [mesAno]);

  async function salvar() {
    if (!descricao || !valor || !vencimento) { mostrarFeedback("erro", "Preencha todos os campos."); return; }
    setSalvando(true);
    const { error } = await supabase.from("contas_pagar").insert([{
      descricao, categoria, valor: Number(valor), vencimento, observacao, status: "pendente"
    }]);
    setSalvando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else {
      mostrarFeedback("sucesso", "Conta registrada!");
      setModalAberto(false);
      setDescricao(""); setValor(""); setVencimento(""); setObservacao("");
      carregar();
    }
  }

  async function marcarPago() {
    if (!confirmandoId) return;
    setProcessando(true);
    await supabase.from("contas_pagar").update({ status: "pago", pago_em: new Date().toISOString().slice(0, 10) }).eq("id", confirmandoId);
    mostrarFeedback("sucesso", "Marcado como pago!");
    setConfirmandoId(null);
    setConfirmandoDescricao("");
    setConfirmandoValor(0);
    setProcessando(false);
    carregar();
  }

  const totais = useMemo(() => ({
    total: contas.reduce((acc, c) => acc + Number(c.valor || 0), 0),
    pago: contas.filter(c => c.status === "pago").reduce((acc, c) => acc + Number(c.valor || 0), 0),
    pendente: contas.filter(c => c.status !== "pago").reduce((acc, c) => acc + Number(c.valor || 0), 0),
  }), [contas]);

  function corCategoria(cat: string) {
    const cores: any = {
      aluguel: "bg-purple-100 text-purple-700", energia: "bg-yellow-100 text-yellow-700",
      agua: "bg-blue-100 text-blue-700", internet: "bg-cyan-100 text-cyan-700",
      fornecedor: "bg-orange-100 text-orange-700", salario: "bg-emerald-100 text-emerald-700",
      imposto: "bg-red-100 text-red-700", outro: "bg-slate-100 text-slate-700"
    };
    return cores[cat] || "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700">Contas a Pagar</h2>
        <button onClick={() => setModalAberto(true)}
          className="h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
          + Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total</p>
          <p className="text-2xl font-black text-slate-800">R$ {totais.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase mb-1">A Pagar</p>
          <p className="text-2xl font-black text-red-500">R$ {totais.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Pago</p>
          <p className="text-2xl font-black text-emerald-600">R$ {totais.pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><p className="text-sm text-slate-400">Carregando...</p></div>
      ) : contas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 gap-2">
          <span className="text-4xl">📤</span>
          <p className="text-sm text-slate-400">Nenhuma conta registrada neste mês.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contas.map(c => (
            <div key={c.id} className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 ${c.status === "pago" ? "border-emerald-200" : "border-slate-200"}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${corCategoria(c.categoria)}`}>{c.categoria}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{c.descricao}</p>
                  <p className="text-xs text-slate-400">Vencimento: {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="font-black text-slate-800">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                {c.status !== "pago" ? (
                  <button
                    onClick={() => { setConfirmandoId(c.id); setConfirmandoDescricao(c.descricao); setConfirmandoValor(Number(c.valor)); }}
                    className="h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition border border-emerald-200">
                    Pagar
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">Pago</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Confirmar pagamento?</h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">{confirmandoDescricao}</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  R$ {confirmandoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">Esta ação marcará a conta como paga e não poderá ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmandoId(null); setConfirmandoDescricao(""); setConfirmandoValor(0); }}
                disabled={processando}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={marcarPago}
                disabled={processando}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {processando ? "Confirmando..." : "Sim, pagar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Nova Conta a Pagar</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Descrição *</label>
                <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel sala junho"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
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
                  <label className="text-xs font-semibold text-slate-500 uppercase">Valor *</label>
                  <input type="number" min="0" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00"
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
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
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
type ItemEsp = { especialidade: string; qtd: string; valor_sessao: string };

function AbaContasReceber({ supabase, mesAno, mostrarFeedback }: any) {
  const [contas, setContas] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [especialidades, setEspecialidades] = useState<ItemEsp[]>([{ especialidade: "", qtd: "", valor_sessao: "" }]);
  const [plano, setPlano] = useState("");
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState("");
  const [dataEnvio, setDataEnvio] = useState("");
  const [descontoISS, setDescontoISS] = useState("");
  const [observacao, setObservacao] = useState("");

  type Confirmacao = { id: string; novoStatus: string; nomeLabel: string; valor: number } | null;
  const [confirmando, setConfirmando] = useState<Confirmacao>(null);
  const [processando, setProcessando] = useState(false);

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

  const criancaSelecionada = criancas.find((c: any) => c.id === criancaId);
  useEffect(() => {
    if (criancaSelecionada) setPlano(criancaSelecionada.plano_saude || "");
  }, [criancaId]);

  const totalBruto = especialidades.reduce(
    (acc, e) => acc + (Number(e.qtd) || 0) * (Number(e.valor_sessao) || 0), 0
  );
  const valorISS = descontoISS ? totalBruto * (Number(descontoISS) / 100) : 0;
  const totalLiquido = totalBruto - valorISS;

  function addEspecialidade() {
    setEspecialidades(prev => [...prev, { especialidade: "", qtd: "", valor_sessao: "" }]);
  }
  function removeEspecialidade(i: number) {
    setEspecialidades(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateEspecialidade(i: number, field: keyof ItemEsp, value: string) {
    setEspecialidades(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function resetForm() {
    setCriancaId("");
    setEspecialidades([{ especialidade: "", qtd: "", valor_sessao: "" }]);
    setPlano(""); setNumeroNotaFiscal(""); setDataEnvio(""); setDescontoISS(""); setObservacao("");
  }

  async function salvar() {
    if (!criancaId) { mostrarFeedback("erro", "Selecione a criança."); return; }
    if (especialidades.some(e => !e.especialidade || !e.qtd || !e.valor_sessao)) {
      mostrarFeedback("erro", "Preencha todos os campos de especialidade."); return;
    }
    setSalvando(true);
    const espComSubtotal = especialidades.map(e => ({
      especialidade: e.especialidade,
      qtd: Number(e.qtd),
      valor_sessao: Number(e.valor_sessao),
      subtotal: Number(e.qtd) * Number(e.valor_sessao),
    }));
    const bruto = espComSubtotal.reduce((acc, e) => acc + e.subtotal, 0);
    const iss = descontoISS ? bruto * (Number(descontoISS) / 100) : 0;
    const { error } = await supabase.from("contas_receber").insert([{
      crianca_id: criancaId,
      mes_referencia: mesAno,
      especialidades: espComSubtotal,
      sessoes_realizadas: espComSubtotal.reduce((acc, e) => acc + e.qtd, 0),
      valor_sessao: 0,
      valor_total: bruto,
      valor_liquido: bruto - iss,
      desconto_iss: Number(descontoISS) || 0,
      plano_saude: plano,
      numero_nota_fiscal: numeroNotaFiscal,
      data_envio: dataEnvio || null,
      observacao,
      status: "pendente",
    }]);
    setSalvando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else {
      mostrarFeedback("sucesso", "Fatura registrada!");
      setModalAberto(false);
      resetForm();
      carregar();
    }
  }

  async function confirmarAlteracao() {
    if (!confirmando) return;
    setProcessando(true);
    const update: any = { status: confirmando.novoStatus };
    if (confirmando.novoStatus === "faturado") update.faturado_em = new Date().toISOString().slice(0, 10);
    if (confirmando.novoStatus === "recebido") update.recebido_em = new Date().toISOString().slice(0, 10);
    await supabase.from("contas_receber").update(update).eq("id", confirmando.id);
    mostrarFeedback("sucesso", "Status atualizado!");
    setConfirmando(null);
    setProcessando(false);
    carregar();
  }

  const totais = useMemo(() => ({
    total: contas.reduce((acc, c) => acc + Number(c.valor_total || 0), 0),
    recebido: contas.filter(c => c.status === "recebido").reduce((acc, c) => acc + Number(c.valor_liquido ?? c.valor_total ?? 0), 0),
    pendente: contas.filter(c => c.status !== "recebido").reduce((acc, c) => acc + Number(c.valor_liquido ?? c.valor_total ?? 0), 0),
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
        <button onClick={() => setModalAberto(true)}
          className="h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
          + Nova Fatura
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total a Receber</p>
          <p className="text-2xl font-black text-slate-800">R$ {totais.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Pendente</p>
          <p className="text-2xl font-black text-amber-500">R$ {totais.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Recebido</p>
          <p className="text-2xl font-black text-emerald-600">R$ {totais.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
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
            const esps: any[] = c.especialidades || [];
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
                        {esps.map((e: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-slate-500">
                            <span>{e.especialidade} — {e.qtd}x R$ {Number(e.valor_sessao).toFixed(2)}</span>
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
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {c.desconto_iss > 0 && (
                      <>
                        <p className="text-xs text-slate-400 line-through">R$ {Number(c.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-red-400">ISS -{c.desconto_iss}%</p>
                      </>
                    )}
                    <p className="font-black text-slate-800">R$ {Number(valorFinal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                {c.status !== "recebido" && (
                  <div className="flex gap-2">
                    {c.status === "pendente" && (
                      <button
                        onClick={() => setConfirmando({ id: c.id, novoStatus: "faturado", nomeLabel: c.criancas?.nome, valor: Number(valorFinal) })}
                        className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200">
                        Marcar Faturado
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmando({ id: c.id, novoStatus: "recebido", nomeLabel: c.criancas?.nome, valor: Number(valorFinal) })}
                      className="h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition border border-emerald-200">
                      Marcar Recebido
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
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

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) { setModalAberto(false); resetForm(); } }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-lg">Nova Fatura</h3>
            <div className="space-y-4">

              {/* Criança + Mês */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Criança *</label>
                  <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {criancas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Mês de Referência</label>
                  <input type="text" value={mesAno} readOnly
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500"/>
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
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-1 text-xs text-slate-400 px-1">
                    <span className="col-span-5">Especialidade</span>
                    <span className="col-span-2 text-center">Qtd</span>
                    <span className="col-span-4">R$/sessão</span>
                  </div>
                  {especialidades.map((e, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-5">
                        <input type="text" value={e.especialidade}
                          onChange={ev => updateEspecialidade(i, "especialidade", ev.target.value)}
                          placeholder="Ex: Fonoaudiologia"
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" value={e.qtd}
                          onChange={ev => updateEspecialidade(i, "qtd", ev.target.value)}
                          placeholder="0"
                          className="w-full h-9 px-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"/>
                      </div>
                      <div className="col-span-4">
                        <input type="number" min="0" value={e.valor_sessao}
                          onChange={ev => updateEspecialidade(i, "valor_sessao", ev.target.value)}
                          placeholder="0,00"
                          className="w-full h-9 px-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div className="col-span-1 flex justify-center">
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
                {especialidades.some(e => e.qtd && e.valor_sessao) && (
                  <div className="mt-2 space-y-1 px-1">
                    {especialidades.map((e, i) => {
                      const sub = (Number(e.qtd) || 0) * (Number(e.valor_sessao) || 0);
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

              {/* Desconto ISS */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Desconto ISS (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={descontoISS}
                  onChange={e => setDescontoISS(e.target.value)} placeholder="Ex: 5"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
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
                      <span className="text-red-400">Desconto ISS ({descontoISS}%)</span>
                      <span className="font-semibold text-red-400">− R$ {valorISS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
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
                {salvando ? "Salvando..." : "Salvar"}
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
function AbaFluxo({ supabase, mesAno }: any) {
  const [loading, setLoading] = useState(true);
  const [entradas, setEntradas] = useState(0);
  const [saidas, setSaidas] = useState(0);
  const [receber, setReceber] = useState(0);
  const [pagar, setPagar] = useState(0);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const [ano, mes] = mesAno.split("-");

      const { data: recebidos } = await supabase.from("contas_receber")
        .select("valor_total").eq("mes_referencia", mesAno).eq("status", "recebido");
      const { data: pagos } = await supabase.from("contas_pagar")
        .select("valor").eq("status", "pago")
        .gte("vencimento", `${ano}-${mes}-01`).lte("vencimento", `${ano}-${mes}-31`);
      const { data: folhaPaga } = await supabase.from("folha_pagamento")
        .select("valor_final").eq("mes", Number(mes)).eq("ano", Number(ano)).eq("status", "pago");
      const { data: aReceber } = await supabase.from("contas_receber")
        .select("valor_total").eq("mes_referencia", mesAno).neq("status", "recebido");
      const { data: aPagar } = await supabase.from("contas_pagar")
        .select("valor").neq("status", "pago")
        .gte("vencimento", `${ano}-${mes}-01`).lte("vencimento", `${ano}-${mes}-31`);
      const { data: folhaPendente } = await supabase.from("folha_pagamento")
        .select("valor_final").eq("mes", Number(mes)).eq("ano", Number(ano)).eq("status", "pendente");

      setEntradas((recebidos || []).reduce((acc: number, r: any) => acc + Number(r.valor_total || 0), 0));
      setSaidas(
        (pagos || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0) +
        (folhaPaga || []).reduce((acc: number, r: any) => acc + Number(r.valor_final || 0), 0)
      );
      setReceber((aReceber || []).reduce((acc: number, r: any) => acc + Number(r.valor_total || 0), 0));
      setPagar(
        (aPagar || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0) +
        (folhaPendente || []).reduce((acc: number, r: any) => acc + Number(r.valor_final || 0), 0)
      );
      setLoading(false);
    }
    carregar();
  }, [mesAno]);

  const saldo = entradas - saidas;

  if (loading) return <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-400">Carregando...</p></div>;

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-slate-700">Fluxo de Caixa</h2>

      <div className={`rounded-2xl p-6 text-center shadow-sm ${saldo >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
        <p className="text-xs font-bold uppercase tracking-wide mb-1 text-slate-500">Saldo do Mês</p>
        <p className={`text-4xl font-black ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          R$ {Math.abs(saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-slate-500 mt-1">{saldo >= 0 ? "Positivo" : "Negativo"}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Entradas Realizadas</p>
          <p className="text-2xl font-black text-emerald-600">R$ {entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Recebido do plano</p>
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase mb-1">Saídas Realizadas</p>
          <p className="text-2xl font-black text-red-500">R$ {saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Contas + folha de pagamento</p>
        </div>
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">A Receber</p>
          <p className="text-2xl font-black text-blue-600">R$ {receber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Pendente do plano</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase mb-1">A Pagar</p>
          <p className="text-2xl font-black text-amber-500">R$ {pagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Contas + folha pendente</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-700 text-sm">Projeção do Mês</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total a receber</span>
            <span className="font-semibold text-blue-600">+ R$ {(entradas + receber).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total a pagar</span>
            <span className="font-semibold text-red-500">- R$ {(saidas + pagar).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-bold">
            <span className="text-slate-700">Saldo projetado</span>
            <span className={entradas + receber - saidas - pagar >= 0 ? "text-emerald-600" : "text-red-600"}>
              R$ {(entradas + receber - saidas - pagar).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}