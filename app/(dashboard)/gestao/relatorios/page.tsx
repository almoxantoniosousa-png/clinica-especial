"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronUp, Filter } from "lucide-react";

export default function GestaoRelatoriosPage() {
  const router = useRouter();
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [meuNome, setMeuNome] = useState("");
  const [feedbackTexto, setFeedbackTexto] = useState<Record<string, string>>({});
  const [enviandoFeedback, setEnviandoFeedback] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: u } = await supabase.from("usuarios").select("nome").eq("email", user.email).maybeSingle();
      setMeuNome(u?.nome || "");
    })();
  }, []);

  async function enviarFeedback(r: any) {
    const texto = feedbackTexto[r.id]?.trim();
    if (!texto) return;
    setEnviandoFeedback(r.id);
    const { error } = await supabase.from("prontuarios").update({
      feedback_gestao: texto, feedback_por: meuNome || null, feedback_em: new Date().toISOString(),
    }).eq("id", r.id);
    setEnviandoFeedback(null);
    if (!error) {
      await supabase.from("notificacoes").insert({
        destinatario_role: "supervisora",
        titulo: "💬 Feedback no seu relatório",
        mensagem: `${meuNome || "Gestão"} comentou seu relatório sobre ${r.criancas?.nome || "criança"}`,
        tipo: "relatorio",
        link: "/supervisora/relatorio",
        autor_nome: meuNome || null,
      });
      setFeedbackTexto(prev => { const c = { ...prev }; delete c[r.id]; return c; });
      carregar();
    }
  }

  async function carregar() {
    setLoading(true);
    setErro("");
    const { data, error } = await supabase
      .from("prontuarios")
      .select("*, criancas(nome)")
      .in("tipo", ["prontuario", "relatorio", "relatorio_diario", "relatorio_supervisora"])
      .order("created_at", { ascending: false });
    if (error) { setErro("Erro ao carregar os relatórios: " + error.message); setLoading(false); return; }
    setRelatorios(data || []);

    // Profissionais únicos para filtro
    const nomes = Array.from(new Set((data || []).map((r: any) => r.autor_nome).filter(Boolean))).sort();
    setProfissionais(nomes as string[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = relatorios.filter(r => {
    const termoBusca = busca.toLowerCase();
    const matchBusca = !busca ||
      r.criancas?.nome?.toLowerCase().includes(termoBusca) ||
      r.autor_nome?.toLowerCase().includes(termoBusca);

    const matchProfissional = !filtroProfissional || r.autor_nome === filtroProfissional;

    const dataRel = r.created_at?.slice(0, 10);
    const matchInicio = !dataInicio || dataRel >= dataInicio;
    const matchFim = !dataFim || dataRel <= dataFim;

    return matchBusca && matchProfissional && matchInicio && matchFim;
  });

  const temFiltro = busca || filtroProfissional || dataInicio || dataFim;

  function limparFiltros() {
    setBusca(""); setFiltroProfissional(""); setDataInicio(""); setDataFim("");
  }

  function parseConteudo(p: any) {
    try { return JSON.parse(p.conteudo); } catch { return null; }
  }

  const campos = [
    { key: "avaliacao",   label: "Avaliação",    badge: "bg-blue-100 text-blue-700" },
    { key: "resultado",   label: "Resultados",   badge: "bg-amber-100 text-amber-700" },
    { key: "intervencao", label: "Intervenção",  badge: "bg-purple-100 text-purple-700" },
    { key: "avancos",     label: "Avanços",      badge: "bg-emerald-100 text-emerald-700" },
    { key: "conclusao",   label: "Conclusão",    badge: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-xs text-slate-400 mt-0.5">Prontuários e relatórios da equipe</p>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Buscar por criança ou profissional..."
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button
            onClick={() => setFiltrosAbertos(v => !v)}
            className={`h-10 px-3 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition ${
              temFiltro ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Filter className="h-4 w-4" />
            Filtros
            {temFiltro && <span className="w-2 h-2 rounded-full bg-blue-500"/>}
          </button>
        </div>

        {filtrosAbertos && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Profissional</label>
              <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Todos</option>
                {profissionais.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">De</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Até</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {loading ? "Carregando..." : `${filtrados.length} de ${relatorios.length} relatório${relatorios.length !== 1 ? "s" : ""}`}
          </span>
          {temFiltro && (
            <button onClick={limparFiltros} className="text-blue-600 hover:underline">Limpar filtros</button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
          <p className="text-sm text-slate-400">Carregando relatórios...</p>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregar} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">
            Tentar novamente
          </button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-slate-400 mt-2">
            {temFiltro ? "Nenhum relatório com esses filtros." : "Nenhum relatório encontrado."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(r => {
            const conteudo = parseConteudo(r);
            const estaAberto = aberto === r.id;
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setAberto(estaAberto ? null : r.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{r.criancas?.nome}</p>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {r.autor_nome}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {estaAberto
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />}
                </button>

                {estaAberto && conteudo && (
                  <div className="border-t border-slate-100">
                    {/* Cabeçalho do documento */}
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{r.criancas?.nome}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.autor_nome} · {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      {conteudo?.especialidade && (
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                          {conteudo.especialidade}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {conteudo.objetivo_atendimento && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Objetivo</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{conteudo.objetivo_atendimento}</p>
                        </div>
                      )}

                      {conteudo.texto && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Relato</p>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{conteudo.texto}</p>
                        </div>
                      )}

                      {conteudo.comportamentos_alvo && (
                        <div className="space-y-3">
                          {conteudo.comportamentos_alvo.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {conteudo.comportamentos_alvo.map((cp: string, i: number) => (
                                <span key={i} className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">🎯 {cp}</span>
                              ))}
                            </div>
                          )}

                          {(conteudo.local || conteudo.hora_chegada || conteudo.comportamento_entrada) && (
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🏁 Entrada</p>
                              {(conteudo.local || conteudo.hora_chegada) && (
                                <p className="text-xs text-slate-500">
                                  {conteudo.local}{conteudo.local && conteudo.hora_chegada ? " · " : ""}
                                  {conteudo.hora_chegada && `chegada às ${conteudo.hora_chegada}`}
                                </p>
                              )}
                              {conteudo.comportamento_entrada && (
                                <p className="text-sm text-slate-700 leading-relaxed">{conteudo.comportamento_entrada}</p>
                              )}
                            </div>
                          )}

                          {(conteudo.periodos || []).map((p: any, i: number) => (
                            <div key={i} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                              <div className="px-3 py-2 bg-slate-100 flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-blue-900 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                <p className="text-xs font-bold text-slate-700">{p.nome || `Período ${i + 1}`}</p>
                                {(p.hora_inicio || p.hora_fim) && (
                                  <span className="text-[11px] text-slate-400 ml-auto">{p.hora_inicio} – {p.hora_fim}</span>
                                )}
                              </div>
                              <div className="p-3 space-y-1.5 text-sm text-slate-700">
                                {p.atividade_oferecida && <p><span className="font-semibold text-slate-500">Atividade:</span> {p.atividade_oferecida}</p>}
                                {p.comportamentos_interferentes?.length > 0 && <p><span className="font-semibold text-slate-500">Comportamentos:</span> {p.comportamentos_interferentes.join(", ")}</p>}
                                {(p.antecedentes?.length > 0 || p.antecedente_outro) && (
                                  <p><span className="font-semibold text-slate-500">Antecedente:</span> {[...(p.antecedentes || []), p.antecedente_outro].filter(Boolean).join(", ")}</p>
                                )}
                                {p.consequencia?.length > 0 && <p><span className="font-semibold text-slate-500">Consequência:</span> {p.consequencia.join(", ")}</p>}
                                {p.frequencia && <p><span className="font-semibold text-slate-500">Frequência:</span> {p.frequencia}</p>}
                                {p.intervencoes_preventivas?.length > 0 && <p><span className="font-semibold text-slate-500">Prevenção:</span> {p.intervencoes_preventivas.join(", ")}</p>}
                              </div>
                            </div>
                          ))}

                          {conteudo.observacoes_gerais && (
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">✍️ Observações gerais</p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{conteudo.observacoes_gerais}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {campos.map(campo => conteudo[campo.key] ? (
                          <div key={campo.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${campo.badge}`}>{campo.label}</span>
                            <p className="text-sm text-slate-700 leading-relaxed mt-2">{conteudo[campo.key]}</p>
                          </div>
                        ) : null)}
                      </div>

                      {!campos.some(c => conteudo[c.key]) && !conteudo.texto && !conteudo.comportamentos_alvo && (
                        <p className="text-sm text-slate-400 italic">Conteúdo não estruturado.</p>
                      )}

                      {/* Feedback */}
                      <div className="pt-3 border-t border-slate-100">
                        {r.feedback_gestao ? (
                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
                              Feedback de {r.feedback_por || "Gestão"}
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{r.feedback_gestao}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Deixar feedback</p>
                            <textarea rows={3} placeholder="Escreva um retorno sobre esse relatório..."
                              value={feedbackTexto[r.id] || ""}
                              onChange={(e) => setFeedbackTexto(prev => ({ ...prev, [r.id]: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                            <button onClick={() => enviarFeedback(r)}
                              disabled={enviandoFeedback === r.id || !feedbackTexto[r.id]?.trim()}
                              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition disabled:opacity-50">
                              {enviandoFeedback === r.id ? "Enviando..." : "Enviar feedback"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
