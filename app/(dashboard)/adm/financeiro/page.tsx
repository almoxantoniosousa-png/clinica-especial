"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";

type Aba = "atendentes" | "contas_pagar" | "contas_receber" | "fluxo";

export default function FinanceiroPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("atendentes");
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
    { id: "atendentes",    label: "Atendentes",      icon: "👤" },
    { id: "contas_pagar",  label: "Contas a Pagar",  icon: "📤" },
    { id: "contas_receber",label: "Contas a Receber", icon: "📥" },
    { id: "fluxo",         label: "Fluxo de Caixa",  icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">Financeiro</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize leading-snug"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
            {mesFormatado}
          </p>
        </div>
        <input
          type="month"
          value={mesAno}
          onChange={e => setMesAno(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-auto min-w-0"
        />
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
          <button
            key={a.id}
            onClick={() => setAba(a.id as Aba)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
              ${aba === a.id ? "bg-blue-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <span>{a.icon}</span>
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>

      {/* CONTEUDO POR ABA */}
      {aba === "atendentes" && <AbaAtendentes supabase={supabase} mesAno={mesAno} mesFormatado={mesFormatado} mostrarFeedback={mostrarFeedback}/>}
      {aba === "contas_pagar" && <AbaContasPagar supabase={supabase} mesAno={mesAno} mostrarFeedback={mostrarFeedback}/>}
      {aba === "contas_receber" && <AbaContasReceber supabase={supabase} mesAno={mesAno} mostrarFeedback={mostrarFeedback}/>}
      {aba === "fluxo" && <AbaFluxo supabase={supabase} mesAno={mesAno}/>}
    </div>
  );
}

// =============================================
// ABA ATENDENTES (codigo original preservado)
// =============================================
function AbaAtendentes({ supabase, mesAno, mesFormatado, mostrarFeedback }: any) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [buscaNome, setBuscaNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [confirmando, setConfirmando] = useState<{ id: string; nome: string } | null>(null);
  const [tabelaAberta, setTabelaAberta] = useState(false);

  const carregarDados = async () => {
    setLoadingDados(true);
    const [ano, mes] = mesAno.split("-");
    const primeiroDia = `${ano}-${mes}-01`;
    const ultimoDia = `${ano}-${mes}-31`;
    const { data, error } = await supabase
      .from("financeiro")
      .select(`*, atendentes ( id, nome ), crianca`)
      .gte("data", primeiroDia)
      .lte("data", ultimoDia)
      .order("data", { ascending: false });
    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    else setRegistros(data || []);
    setLoadingDados(false);
  };

  useEffect(() => { carregarDados(); }, [mesAno]);

  const handlePagarAtendente = async () => {
    if (!confirmando) return;
    setCarregando(true);
    const [ano, mes] = mesAno.split("-");
    const { error } = await supabase
      .from("financeiro")
      .update({ status: "pago" })
      .eq("atendente_id", confirmando.id)
      .gte("data", `${ano}-${mes}-01`)
      .lte("data", `${ano}-${mes}-31`);
    setCarregando(false);
    setConfirmando(null);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else { mostrarFeedback("sucesso", `Pagamento de ${confirmando.nome} confirmado!`); carregarDados(); }
  };

  const cardsAtendentes = useMemo(() => {
    const grupos: any = {};
    registros.forEach(reg => {
      const nome = reg.atendentes?.nome || "Nao Identificado";
      if (!grupos[nome]) grupos[nome] = { id: reg.atendente_id || reg.atendentes?.id, nome, criancas: new Set(), horas: 0, total: 0, pendente: false };
      grupos[nome].horas += Number(reg.horas) || 0;
      grupos[nome].total += Number(reg.valor_total) || 0;
      grupos[nome].criancas.add(reg.crianca || "Nao informada");
      if (reg.status === "pendente") grupos[nome].pendente = true;
    });
    return Object.values(grupos).filter((a: any) => a.nome.toLowerCase().includes(buscaNome.toLowerCase()));
  }, [registros, buscaNome]);

  const totais = useMemo(() => ({
    total: registros.reduce((acc, r) => acc + Number(r.valor_total || 0), 0),
    pago: registros.filter(r => r.status === "pago").reduce((acc, r) => acc + Number(r.valor_total || 0), 0),
    pendente: registros.filter(r => r.status === "pendente").reduce((acc, r) => acc + Number(r.valor_total || 0), 0),
  }), [registros]);

  const coresAvatar = ["bg-blue-100 text-blue-700","bg-purple-100 text-purple-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-cyan-100 text-cyan-700"];
  const iniciais = (nome: string) => nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  const corAvatar = (nome: string) => coresAvatar[nome.charCodeAt(0) % coresAvatar.length];

  return (
    <div className="space-y-5">
      {/* Busca */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input type="text" placeholder="Buscar profissional..." value={buscaNome}
          onChange={e => setBuscaNome(e.target.value)}
          className="h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"/>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total do mes</p>
          <p className="text-2xl font-black text-slate-800">R$ {totais.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{registros.length} registros</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Pendente</p>
          <p className="text-2xl font-black text-amber-500">R$ {totais.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{registros.filter(r => r.status === "pendente").length} registros</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Pago</p>
          <p className="text-2xl font-black text-emerald-600">R$ {totais.pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{registros.filter(r => r.status === "pago").length} registros</p>
        </div>
      </div>

      {/* Cards atendentes */}
      {loadingDados ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando dados...</p>
        </div>
      ) : cardsAtendentes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-slate-400 font-medium">Nenhum registro encontrado para este periodo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardsAtendentes.map((at: any) => (
            <div key={at.nome} className={`bg-white rounded-2xl shadow-sm border-l-4 border border-slate-200 p-5 flex flex-col justify-between gap-4 ${at.pendente ? "border-l-amber-400" : "border-l-emerald-400"}`}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(at.nome)}`}>{iniciais(at.nome)}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{at.nome}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${at.pendente ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {at.pendente ? "Pendente" : "Pago"}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs text-slate-500">Atendidos: <span className="text-slate-700 font-medium">{Array.from(at.criancas).join(", ")}</span></p>
                  <p className="text-xs text-slate-500">Horas: <span className="text-slate-700 font-bold">{at.horas.toFixed(2)}h</span></p>
                  <p className="text-lg font-black text-slate-800">R$ {at.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              {at.pendente ? (
                <button onClick={() => setConfirmando({ id: at.id, nome: at.nome })} disabled={carregando}
                  className="w-full h-11 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                  Confirmar Pagamento
                </button>
              ) : (
                <div className="w-full h-11 flex items-center justify-center bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-100">
                  Tudo Pago
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabela detalhada */}
      {!loadingDados && registros.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setTabelaAberta(!tabelaAberta)}
            className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-700 text-sm">Registros detalhados</h3>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{registros.length}</span>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${tabelaAberta ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {tabelaAberta && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Data","Atendente","Crianca","Local","Total","Status"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registros.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">{r.atendentes?.nome || "Nao identificado"}</td>
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{r.crianca || "---"}</td>
                      <td className="px-5 py-3 text-slate-600 capitalize whitespace-nowrap">{r.local}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">R$ {Number(r.valor_total).toFixed(2)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${r.status === "pendente" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                          {r.status === "pendente" ? "Pendente" : "Pago"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmacao */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setConfirmando(null); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center"><span className="text-2xl">💰</span></div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Confirmar pagamento</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Deseja confirmar o pagamento de <span className="font-semibold text-slate-700">{confirmando.nome}</span> referente a <span className="font-semibold text-slate-700" style={{ textTransform: "capitalize" }}>{mesFormatado}</span>?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmando(null)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={handlePagarAtendente} disabled={carregando} className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {carregando ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    const { error } = await supabase.from("contas_pagar").insert([{ descricao, categoria, valor: Number(valor), vencimento, observacao, status: "pendente" }]);
    setSalvando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else { mostrarFeedback("sucesso", "Conta registrada!"); setModalAberto(false); setDescricao(""); setValor(""); setVencimento(""); setObservacao(""); carregar(); }
  }

  async function marcarPago(id: string) {
    await supabase.from("contas_pagar").update({ status: "pago", pago_em: new Date().toISOString().slice(0, 10) }).eq("id", id);
    mostrarFeedback("sucesso", "Marcado como pago!");
    carregar();
  }

  const totais = useMemo(() => ({
    total: contas.reduce((acc, c) => acc + Number(c.valor || 0), 0),
    pago: contas.filter(c => c.status === "pago").reduce((acc, c) => acc + Number(c.valor || 0), 0),
    pendente: contas.filter(c => c.status !== "pago").reduce((acc, c) => acc + Number(c.valor || 0), 0),
  }), [contas]);

  function corCategoria(cat: string) {
    const cores: any = { aluguel: "bg-purple-100 text-purple-700", energia: "bg-yellow-100 text-yellow-700", agua: "bg-blue-100 text-blue-700", internet: "bg-cyan-100 text-cyan-700", fornecedor: "bg-orange-100 text-orange-700", salario: "bg-emerald-100 text-emerald-700", imposto: "bg-red-100 text-red-700", outro: "bg-slate-100 text-slate-700" };
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
          <p className="text-sm text-slate-400">Nenhuma conta registrada neste mes.</p>
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
                  <button onClick={() => marcarPago(c.id)}
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

      {/* Modal nova conta */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Nova Conta a Pagar</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Descricao *</label>
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
                  <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Vencimento *</label>
                <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Observacao</label>
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
function AbaContasReceber({ supabase, mesAno, mostrarFeedback }: any) {
  const [contas, setContas] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [sessoes, setSessoes] = useState("");
  const [valorSessao, setValorSessao] = useState("");
  const [plano, setPlano] = useState("");
  const [processo, setProcesso] = useState("");
  const [observacao, setObservacao] = useState("");

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from("contas_receber")
      .select("*, criancas(nome)")
      .eq("mes_referencia", mesAno)
      .order("created_at", { ascending: false });
    setContas(data || []);
    const { data: cs } = await supabase.from("criancas").select("id, nome, valor_sessao, plano_saude, numero_processo").order("nome");
    setCriancas(cs || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [mesAno]);

  const criancaSelecionada = criancas.find(c => c.id === criancaId);

  useEffect(() => {
    if (criancaSelecionada) {
      setValorSessao(criancaSelecionada.valor_sessao || "");
      setPlano(criancaSelecionada.plano_saude || "");
      setProcesso(criancaSelecionada.numero_processo || "");
    }
  }, [criancaId]);

  async function salvar() {
    if (!criancaId || !sessoes || !valorSessao) { mostrarFeedback("erro", "Preencha todos os campos obrigatorios."); return; }
    setSalvando(true);
    const total = Number(sessoes) * Number(valorSessao);
    const { error } = await supabase.from("contas_receber").insert([{
      crianca_id: criancaId, mes_referencia: mesAno,
      sessoes_realizadas: Number(sessoes), valor_sessao: Number(valorSessao),
      valor_total: total, plano_saude: plano, numero_processo: processo,
      observacao, status: "pendente"
    }]);
    setSalvando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else { mostrarFeedback("sucesso", "Fatura registrada!"); setModalAberto(false); setCriancaId(""); setSessoes(""); setValorSessao(""); setPlano(""); setProcesso(""); setObservacao(""); carregar(); }
  }

  async function alterarStatus(id: string, status: string) {
    const update: any = { status };
    if (status === "faturado") update.faturado_em = new Date().toISOString().slice(0, 10);
    if (status === "recebido") update.recebido_em = new Date().toISOString().slice(0, 10);
    await supabase.from("contas_receber").update(update).eq("id", id);
    mostrarFeedback("sucesso", "Status atualizado!");
    carregar();
  }

  const totais = useMemo(() => ({
    total: contas.reduce((acc, c) => acc + Number(c.valor_total || 0), 0),
    recebido: contas.filter(c => c.status === "recebido").reduce((acc, c) => acc + Number(c.valor_total || 0), 0),
    pendente: contas.filter(c => c.status !== "recebido").reduce((acc, c) => acc + Number(c.valor_total || 0), 0),
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
          <p className="text-sm text-slate-400">Nenhuma fatura registrada neste mes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contas.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{c.criancas?.nome}</p>
                  <p className="text-xs text-slate-400">{c.sessoes_realizadas} sessoes x R$ {Number(c.valor_sessao).toFixed(2)}</p>
                  {c.plano_saude && <p className="text-xs text-slate-400">Plano: {c.plano_saude}</p>}
                  {c.numero_processo && <p className="text-xs text-slate-400">Processo: {c.numero_processo}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-slate-800">R$ {Number(c.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${corStatus(c.status)}`}>
                    {c.status === "pendente" ? "Pendente" : c.status === "faturado" ? "Faturado" : "Recebido"}
                  </span>
                </div>
              </div>
              {c.status !== "recebido" && (
                <div className="flex gap-2">
                  {c.status === "pendente" && (
                    <button onClick={() => alterarStatus(c.id, "faturado")}
                      className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200">
                      Marcar Faturado
                    </button>
                  )}
                  <button onClick={() => alterarStatus(c.id, "recebido")}
                    className="h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition border border-emerald-200">
                    Marcar Recebido
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nova fatura */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800">Nova Fatura</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Crianca *</label>
                <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Sessoes *</label>
                  <input type="number" value={sessoes} onChange={e => setSessoes(e.target.value)} placeholder="0"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Valor/Sessao *</label>
                  <input type="number" value={valorSessao} onChange={e => setValorSessao(e.target.value)} placeholder="0,00"
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              {sessoes && valorSessao && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-sm font-bold text-blue-800">Total: R$ {(Number(sessoes) * Number(valorSessao)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Plano de Saude</label>
                <input type="text" value={plano} onChange={e => setPlano(e.target.value)} placeholder="Ex: Unimed"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Numero do Processo</label>
                <input type="text" value={processo} onChange={e => setProcesso(e.target.value)} placeholder="Liminar judicial"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Observacao</label>
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
        .select("valor").eq("status", "pago").gte("vencimento", `${ano}-${mes}-01`).lte("vencimento", `${ano}-${mes}-31`);
      const { data: atendentes } = await supabase.from("financeiro")
        .select("valor_total").eq("status", "pago").gte("data", `${ano}-${mes}-01`).lte("data", `${ano}-${mes}-31`);
      const { data: aReceber } = await supabase.from("contas_receber")
        .select("valor_total").eq("mes_referencia", mesAno).neq("status", "recebido");
      const { data: aPagar } = await supabase.from("contas_pagar")
        .select("valor").neq("status", "pago").gte("vencimento", `${ano}-${mes}-01`).lte("vencimento", `${ano}-${mes}-31`);

      setEntradas((recebidos || []).reduce((acc: number, r: any) => acc + Number(r.valor_total || 0), 0));
      setSaidas(
        (pagos || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0) +
        (atendentes || []).reduce((acc: number, r: any) => acc + Number(r.valor_total || 0), 0)
      );
      setReceber((aReceber || []).reduce((acc: number, r: any) => acc + Number(r.valor_total || 0), 0));
      setPagar(
        (aPagar || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0)
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

      {/* Saldo */}
      <div className={`rounded-2xl p-6 text-center shadow-sm ${saldo >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
        <p className="text-xs font-bold uppercase tracking-wide mb-1 text-slate-500">Saldo do Mes</p>
        <p className={`text-4xl font-black ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          R$ {Math.abs(saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-slate-500 mt-1">{saldo >= 0 ? "Positivo" : "Negativo"}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Entradas Realizadas</p>
          <p className="text-2xl font-black text-emerald-600">R$ {entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Recebido do plano</p>
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase mb-1">Saidas Realizadas</p>
          <p className="text-2xl font-black text-red-500">R$ {saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Contas + atendentes</p>
        </div>
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">A Receber</p>
          <p className="text-2xl font-black text-blue-600">R$ {receber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Pendente do plano</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase mb-1">A Pagar</p>
          <p className="text-2xl font-black text-amber-500">R$ {pagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">Contas pendentes</p>
        </div>
      </div>

      {/* Projecao */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-700 text-sm">Projecao do Mes</h3>
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