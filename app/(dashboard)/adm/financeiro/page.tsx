"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";

export default function FinanceiroPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [registros, setRegistros] = useState<any[]>([]);
  const [mesAno, setMesAno] = useState(() => new Date().toISOString().slice(0, 7));
  const [buscaNome, setBuscaNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  // Feedback inline
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  // Modal de confirmação de pagamento
  const [confirmando, setConfirmando] = useState<{ id: string; nome: string } | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

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

    if (error) {
      mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    } else {
      setRegistros(data || []);
    }
    setLoadingDados(false);
  };

  useEffect(() => { carregarDados(); }, [mesAno, supabase]);

  const handlePagarAtendente = async () => {
    if (!confirmando) return;
    setCarregando(true);
    const [ano, mes] = mesAno.split("-");
    const primeiroDia = `${ano}-${mes}-01`;
    const ultimoDia = `${ano}-${mes}-31`;

    const { error } = await supabase
      .from("financeiro")
      .update({ status: "pago" })
      .eq("atendente_id", confirmando.id)
      .gte("data", primeiroDia)
      .lte("data", ultimoDia);

    setCarregando(false);
    setConfirmando(null);

    if (error) {
      mostrarFeedback("erro", "Erro ao confirmar pagamento: " + error.message);
    } else {
      mostrarFeedback("sucesso", `Pagamento de ${confirmando.nome} confirmado com sucesso!`);
      carregarDados();
    }
  };

  // Agrupa registros por atendente
  const cardsAtendentes = useMemo(() => {
    const grupos: any = {};
    registros.forEach((reg) => {
      const nomeProfissional = reg.atendentes?.nome || "Não Identificado";
      const nomeCrianca = reg.crianca || "Não informada";
      const idProfissional = reg.atendente_id || reg.atendentes?.id;

      if (!grupos[nomeProfissional]) {
        grupos[nomeProfissional] = {
          id: idProfissional,
          nome: nomeProfissional,
          criancas: new Set(),
          horas: 0,
          total: 0,
          pendente: false,
        };
      }
      grupos[nomeProfissional].horas += Number(reg.horas) || 0;
      grupos[nomeProfissional].total += Number(reg.valor_total) || 0;
      grupos[nomeProfissional].criancas.add(nomeCrianca);
      if (reg.status === "pendente") grupos[nomeProfissional].pendente = true;
    });

    return Object.values(grupos).filter((a: any) =>
      a.nome.toLowerCase().includes(buscaNome.toLowerCase())
    );
  }, [registros, buscaNome]);

  // Totalizadores
  const totais = useMemo(() => {
    const total = registros.reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
    const pago = registros.filter(r => r.status === "pago").reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
    const pendente = registros.filter(r => r.status === "pendente").reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
    return { total, pago, pendente };
  }, [registros]);

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatar = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];

  function corAvatar(nome: string) {
    return coresAvatar[nome.charCodeAt(0) % coresAvatar.length];
  }

  const mesFormatado = new Date(mesAno + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">
            Financeiro
          </h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{mesFormatado}</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="month"
            value={mesAno}
            onChange={(e) => setMesAno(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700
              focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
          />
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar profissional..."
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              className="h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white w-full sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}
        >
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* CARDS RESUMO DO MÊS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total do mês</p>
          <p className="text-2xl font-black text-slate-800">
            R$ {totais.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">{registros.length} registros</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Pendente</p>
          <p className="text-2xl font-black text-amber-500">
            R$ {totais.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">{registros.filter(r => r.status === "pendente").length} registros</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Pago</p>
          <p className="text-2xl font-black text-emerald-600">
            R$ {totais.pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">{registros.filter(r => r.status === "pago").length} registros</p>
        </div>
      </div>

      {/* CARDS POR ATENDENTE */}
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
          <p className="text-sm text-slate-400 font-medium">Nenhum registro encontrado para este período.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardsAtendentes.map((at: any) => (
            <div
              key={at.nome}
              className={`bg-white rounded-2xl shadow-sm border-l-4 border border-slate-200 p-5 flex flex-col justify-between gap-4
                ${at.pendente ? "border-l-amber-400" : "border-l-emerald-400"}`}
            >
              {/* Info do atendente */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(at.nome)}`}>
                    {iniciais(at.nome)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{at.nome}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${at.pendente ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {at.pendente ? "Pendente" : "Pago"}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs text-slate-500">
                    Atendidos: <span className="text-slate-700 font-medium">{Array.from(at.criancas).join(", ")}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Horas: <span className="text-slate-700 font-bold">{at.horas.toFixed(2)}h</span>
                  </p>
                  <p className="text-lg font-black text-slate-800">
                    R$ {at.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Botão ou badge */}
              {at.pendente ? (
                <button
                  onClick={() => setConfirmando({ id: at.id, nome: at.nome })}
                  disabled={carregando}
                  className="w-full h-11 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white
                    text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  Confirmar Pagamento
                </button>
              ) : (
                <div className="w-full h-11 flex items-center justify-center bg-emerald-50
                  text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-100">
                  ✓ Tudo Pago
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TABELA DE REGISTROS */}
      {!loadingDados && registros.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 text-sm">Registros detalhados</h3>
          </div>

          {/* Scroll horizontal no mobile */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Atendente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Criança</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Local</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {r.atendentes?.nome || "Não identificado"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {r.crianca || "---"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 capitalize whitespace-nowrap">
                      {r.local}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      R$ {Number(r.valor_total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                        ${r.status === "pendente"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                        {r.status === "pendente" ? "Pendente" : "Pago"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">{registros.length} registro{registros.length !== 1 ? "s" : ""} no período</p>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE PAGAMENTO */}
      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmando(null); }}
        >
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Confirmar pagamento</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Deseja confirmar o pagamento de todas as horas de{" "}
                  <span className="font-semibold text-slate-700">{confirmando.nome}</span>{" "}
                  referentes a <span className="font-semibold text-slate-700 capitalize">{mesFormatado}</span>?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm
                  font-semibold hover:bg-slate-50 active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePagarAtendente}
                disabled={carregando}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm
                  font-semibold active:scale-95 transition disabled:opacity-50"
              >
                {carregando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Confirmando...
                  </span>
                ) : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}