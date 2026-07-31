"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Search } from "lucide-react";

const POR_PAGINA = 8;

export default function MeusComunicadosPage() {
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [atId, setAtId] = useState("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [visiveis, setVisiveis] = useState(POR_PAGINA);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar(id: string) {
    setLoading(true);
    const { data } = await supabase
      .from("formularios_escolares")
      .select("*, criancas(nome, foto_url)")
      .eq("at_id", id)
      .order("created_at", { ascending: false });
    setComunicados(data || []);
    setLoading(false);
  }

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAtId(user.id);
        carregar(user.id);
      }
    }
    inicializar();
  }, []);

  useEffect(() => {
    if (!atId) return;
    const canal = supabase
      .channel(`meus-comunicados-${atId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "formularios_escolares", filter: `at_id=eq.${atId}` },
        (payload: { new: any }) => {
          setComunicados(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "formularios_escolares", filter: `at_id=eq.${atId}` },
        () => carregar(atId)
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [atId]);

  function iniciais(nome: string) {
    return nome?.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?";
  }

  const statusConfig: any = {
    aguardando: { label: "⏳ Em revisão", color: "bg-amber-50 text-amber-700 border-amber-200", borda: "border-l-amber-400" },
    aprovado:   { label: "⏳ Em revisão", color: "bg-amber-50 text-amber-700 border-amber-200", borda: "border-l-amber-400" },
    enviado:    { label: "✓ Enviado para supervisão", color: "bg-emerald-50 text-emerald-700 border-emerald-200", borda: "border-l-emerald-400" },
  };

  const pendentes = comunicados.filter(c => !c.enviado_familia).length;
  const enviados  = comunicados.filter(c => c.enviado_familia).length;
  const correcaoPendente = comunicados.find(c => c.correcao_solicitada);

  const filtrados = comunicados.filter(c =>
    (!busca || (c.criancas?.nome || "").toLowerCase().includes(busca.toLowerCase())) &&
    (!filtroData || c.data === filtroData)
  );
  const exibidos = filtrados.slice(0, visiveis);
  const temMais = visiveis < filtrados.length;

  useEffect(() => { setVisiveis(POR_PAGINA); }, [busca, filtroData]);

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meus Comunicados</h1>
          <p className="text-xs text-slate-400 mt-0.5">Histórico e status de aprovação</p>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={"flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border " +
          (feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* CORREÇÃO PENDENTE */}
      {correcaoPendente && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔁</span>
            <div>
              <p className="text-sm font-bold text-orange-700">Correção pendente da supervisora</p>
              {!!correcaoPendente.correcao_topicos?.length && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {correcaoPendente.correcao_topicos.map((t: string) => (
                    <span key={t} className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-orange-600 mt-0.5">
                {correcaoPendente.criancas?.nome} · {correcaoPendente.correcao_texto}
              </p>
              <p className="text-xs text-orange-500 mt-1">Você não consegue criar um novo comunicado até corrigir este.</p>
            </div>
          </div>
          <Link href="/atendente/formulario-escolar"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition shrink-0">
            Corrigir agora
          </Link>
        </div>
      )}

      {/* CARDS RESUMO */}
      {!loading && comunicados.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-slate-800">{comunicados.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-amber-600">{pendentes}</p>
            <p className="text-xs text-amber-500 mt-0.5">Em revisão</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-emerald-600">{enviados}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Enviados</p>
          </div>
        </div>
      )}


      {/* FILTROS */}
      {!loading && comunicados.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
            <input type="text" placeholder="Buscar por criança..." value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          {(busca || filtroData) && (
            <button onClick={() => { setBusca(""); setFiltroData(""); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold px-2">
              Limpar filtros
            </button>
          )}
          {(busca || filtroData) && <span className="text-xs text-slate-400">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* LISTA */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : comunicados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📄</span>
          <p className="text-sm text-slate-400 font-medium">Nenhum comunicado enviado ainda.</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📄</span>
          <p className="text-sm text-slate-400 font-medium">Nenhum comunicado encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exibidos.map(c => {
            const cfg = statusConfig[c.status] || statusConfig.aguardando;
            return (
              <div key={c.id} onClick={() => setDetalhe(c)}
                className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 border-l-4 cursor-pointer hover:shadow-md transition ${cfg.borda}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Foto criança */}
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                      {c.criancas?.foto_url
                        ? <img src={c.criancas.foto_url} alt={c.criancas.nome} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {iniciais(c.criancas?.nome)}
                          </div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{c.criancas?.nome}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Badge status */}
                  <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0 pl-14 sm:pl-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {c.correcao_solicitada && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                        🔁 Correção pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Observação da supervisora */}
                {c.obs_supervisora && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-600">Observação da supervisora:</p>
                    <p className="text-sm text-slate-700 mt-0.5">{c.obs_supervisora}</p>
                  </div>
                )}

              </div>
            );
          })}
          {temMais && (
            <div className="flex justify-center pt-2">
              <button onClick={() => setVisiveis(v => v + POR_PAGINA)}
                className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700 transition">
                Ver mais {Math.min(POR_PAGINA, filtrados.length - visiveis)} →
              </button>
            </div>
          )}
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">{detalhe.criancas?.nome}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(detalhe.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setDetalhe(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition">✕</button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🏁 Entrada e Interação</p>
              <p className="text-sm text-slate-700">Chegada: {detalhe.hora_chegada || "—"} · Saída: {detalhe.hora_saida || "—"}</p>
              <p className="text-sm text-slate-700">{(detalhe.interacao || []).join(", ") || "—"}</p>
              {detalhe.interacao_obs && <p className="text-sm text-slate-700">Outras observações: {detalhe.interacao_obs}</p>}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🛠 Autonomia e Higiene</p>
              <p className="text-sm text-slate-700">Nível de autonomia: {detalhe.autonomia_nivel ?? "—"}</p>
              <p className="text-sm text-slate-700">Idas ao banheiro: {detalhe.idas_banheiro ?? "—"} · Evacuou: {detalhe.evacuou ? "Sim" : "Não"}</p>
              {detalhe.banheiro_obs && <p className="text-sm text-slate-700">Sobre o banheiro: {detalhe.banheiro_obs}</p>}
              {detalhe.evacuou_obs && <p className="text-sm text-slate-700">Sobre evacuar: {detalhe.evacuou_obs}</p>}
              {detalhe.periodo_menstrual && <p className="text-sm text-slate-700">Período menstrual: Sim</p>}
              {detalhe.periodo_menstrual_obs && <p className="text-sm text-slate-700">Sobre o período: {detalhe.periodo_menstrual_obs}</p>}
              <p className="text-sm text-slate-700">💧 Ingestão de água: {detalhe.agua_ingestao || "—"}</p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🏀 Recreio e Socialização</p>
              <p className="text-sm text-slate-700">Socialização: {(detalhe.socializacao || []).join(", ") || "—"}</p>
              {detalhe.amizades_intervalo && <p className="text-sm text-slate-700">Amizades no intervalo: {detalhe.amizades_intervalo}</p>}
              <p className="text-sm text-slate-700">Atenção: {(detalhe.atencao || []).join(", ") || "—"}</p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">📖 Agenda e Recados</p>
              <p className="text-sm text-slate-700">Lanche: {detalhe.lanche || "—"} · Comeu tudo: {detalhe.comeu_tudo ? "Sim" : "Não"}</p>
              {detalhe.comeu_tudo_obs && <p className="text-sm text-slate-700">Sobre o lanche: {detalhe.comeu_tudo_obs}</p>}
              {detalhe.atividades_sala && <p className="text-sm text-slate-700">Atividades em sala: {detalhe.atividades_sala}</p>}
              {detalhe.interacao_sala && <p className="text-sm text-slate-700">Interação em sala: {detalhe.interacao_sala}</p>}
              {detalhe.tarefa_casa && <p className="text-sm text-slate-700">Tarefa de casa: {detalhe.tarefa_casa}</p>}
              {detalhe.materiais_pedir && <p className="text-sm text-slate-700">Materiais a pedir: {detalhe.materiais_pedir}</p>}
              {detalhe.eventos_escolares && <p className="text-sm text-slate-700">🎉 Eventos escolares: {detalhe.eventos_escolares}</p>}
              {detalhe.obs_gerais && <p className="text-sm text-slate-700">Observações: {detalhe.obs_gerais}</p>}
            </div>

            {detalhe.obs_supervisora && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-600">Observação da supervisora:</p>
                <p className="text-sm text-slate-700 mt-0.5">{detalhe.obs_supervisora}</p>
              </div>
            )}

            {detalhe.correcao_solicitada && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-orange-700">🔁 Correção pendente</p>
                {!!detalhe.correcao_topicos?.length && (
                  <div className="flex flex-wrap gap-1.5">
                    {detalhe.correcao_topicos.map((t: string) => (
                      <span key={t} className="text-[11px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-slate-700">{detalhe.correcao_texto}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}