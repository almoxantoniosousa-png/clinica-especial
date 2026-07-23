"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { FileText, Plus, MessageSquare, ArrowLeft, ChevronDown, ChevronUp, Trash2, X } from "lucide-react";

type Crianca = { id: string; nome: string };

type Periodo = {
  nome: string;
  hora_inicio: string;
  hora_fim: string;
  atividade_oferecida: string;
  tempo_engajamento: string;
  comportamentos_interferentes: string[];
  antecedentes: string[];
  antecedente_outro: string;
  consequencia: string[];
  duracao_intervencao: string;
  frequencia: string;
  intervencoes_preventivas: string[];
};

type ConteudoABC = {
  local: string;
  hora_chegada: string;
  comportamento_entrada: string;
  comportamentos_alvo: string[];
  periodos: Periodo[];
  observacoes_gerais: string;
  data_evento: string;
};

type Relatorio = {
  id: string;
  crianca_id: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  feedback_gestao: string | null;
  feedback_por: string | null;
  feedback_em: string | null;
  criancas?: { nome: string };
};

const ATIVIDADE_OFERECIDA = [
  "Professor não disponibilizou atividade",
  "Atividade fora do tópico da turma",
  "Professor entregou atividade apropriada",
  "Atividade entregue pela AT/clínico",
  "Jogos pedagógicos utilizados",
];

const COMPORTAMENTOS_GENERICOS = [
  "Levantar da cadeira sem pedir",
  "Vocalização alta / gritos",
  "Recusa em iniciar atividade",
  "Sair da sala sem autorização",
  "Entrou em outra sala sem autorização",
  "Bateu ou verbalizou abuso contra outro paciente/colega",
  "Tocou área íntima de um funcionário",
  "Bateu em um funcionário",
  "Acessou notebook/computador sem permissão",
];

const ANTECEDENTES = [
  "Transição de atividade",
  "Período de espera",
  "Situação de ansiedade social",
  "Demanda acadêmica",
  "Negação de um pedido",
  "Atenção do professor em outro colega",
];

const CONSEQUENCIAS = [
  "Redirecionamento verbal",
  "Bloqueio físico da ação",
  "Retirada da sala / pausa",
];

const INTERVENCOES_PREVENTIVAS = [
  "Antecipação verbal da transição",
  "Oferta de atividade preferida",
  "Reforço de comportamento alternativo",
  "Ajuste de posição na sala",
];

function periodoVazio(): Periodo {
  return {
    nome: "", hora_inicio: "", hora_fim: "", atividade_oferecida: "",
    tempo_engajamento: "", comportamentos_interferentes: [], antecedentes: [],
    antecedente_outro: "", consequencia: [], duracao_intervencao: "",
    frequencia: "", intervencoes_preventivas: [],
  };
}

function toggleEm(lista: string[], valor: string) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

export default function RelatorioSupervisoraPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [autorId, setAutorId] = useState("");
  const [autorNome, setAutorNome] = useState("");

  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"lista" | "novo">("lista");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Campos do novo registro
  const [criancaId, setCriancaId] = useState("");
  const [dataEvento, setDataEvento] = useState(() => new Date().toISOString().slice(0, 10));
  const [local, setLocal] = useState("");
  const [horaChegada, setHoraChegada] = useState("");
  const [comportamentoEntrada, setComportamentoEntrada] = useState("");
  const [comportamentosAlvo, setComportamentosAlvo] = useState<string[]>([]);
  const [novoAlvo, setNovoAlvo] = useState("");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoAberto, setPeriodoAberto] = useState<number | null>(null);
  const [observacoesGerais, setObservacoesGerais] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: u } = await supabase.from("usuarios").select("id, nome").eq("email", user.email).maybeSingle();
      if (u) { setAutorId(u.id); setAutorNome(u.nome || ""); }

      const { data: cr } = await supabase.from("criancas").select("id, nome").eq("ativo", true).order("nome");
      setCriancas(cr || []);
    })();
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setLoading(false); return; }
    const { data: u } = await supabase.from("usuarios").select("id").eq("email", user.email).maybeSingle();
    if (!u) { setLoading(false); return; }

    const { data } = await supabase
      .from("prontuarios")
      .select("id, crianca_id, titulo, conteudo, created_at, feedback_gestao, feedback_por, feedback_em, criancas(nome)")
      .eq("tipo", "relatorio_supervisora")
      .eq("autor_id", u.id)
      .order("created_at", { ascending: false });
    setRelatorios((data ?? []) as unknown as Relatorio[]);
    setLoading(false);
  }

  function abrirNovo() {
    setCriancaId("");
    setDataEvento(new Date().toISOString().slice(0, 10));
    setLocal("");
    setHoraChegada("");
    setComportamentoEntrada("");
    setComportamentosAlvo([]);
    setNovoAlvo("");
    setPeriodos([]);
    setPeriodoAberto(null);
    setObservacoesGerais("");
    setErro("");
    setView("novo");
  }

  function adicionarAlvo() {
    const v = novoAlvo.trim();
    if (!v) return;
    setComportamentosAlvo((prev) => [...prev, v]);
    setNovoAlvo("");
  }

  function adicionarPeriodo() {
    setPeriodos((prev) => [...prev, periodoVazio()]);
    setPeriodoAberto(periodos.length);
  }

  function atualizarPeriodo(idx: number, patch: Partial<Periodo>) {
    setPeriodos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function removerPeriodo(idx: number) {
    setPeriodos((prev) => prev.filter((_, i) => i !== idx));
    setPeriodoAberto(null);
  }

  async function salvar() {
    if (!criancaId) { setErro("Selecione a criança."); return; }
    if (comportamentosAlvo.length === 0 && periodos.length === 0 && !observacoesGerais.trim()) {
      setErro("Registre pelo menos um comportamento-alvo, um período ou uma observação.");
      return;
    }
    setSalvando(true);
    setErro("");

    const nomeCrianca = criancas.find((c) => c.id === criancaId)?.nome || "Criança";
    const conteudoObj: ConteudoABC = {
      local, hora_chegada: horaChegada, comportamento_entrada: comportamentoEntrada,
      comportamentos_alvo: comportamentosAlvo, periodos, observacoes_gerais: observacoesGerais,
      data_evento: dataEvento,
    };
    const conteudo = JSON.stringify(conteudoObj);

    const { data: novo, error } = await supabase.from("prontuarios").insert([{
      crianca_id: criancaId,
      autor_id: autorId,
      autor_nome: autorNome || null,
      tipo: "relatorio_supervisora",
      titulo: `Registro ABC — ${nomeCrianca} — ${new Date(dataEvento + "T12:00:00").toLocaleDateString("pt-BR")}`,
      conteudo,
      visivel_familia: false,
      visivel_supervisora: true,
      visivel_gestao: true,
    }]).select().single();

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: autorNome, usuario_nome: autorNome, acao: "Registrou relatório de supervisão",
      tabela: "prontuarios", registro_id: novo?.id,
      descricao: `${nomeCrianca} — ${comportamentosAlvo.join(", ") || "sem comportamento-alvo definido"}`,
    });

    await supabase.from("notificacoes").insert({
      destinatario_role: "gestao",
      titulo: "📝 Novo Registro ABC da Supervisora",
      mensagem: `${autorNome} registrou um Registro ABC sobre ${nomeCrianca}`,
      tipo: "relatorio",
      link: "/gestao/relatorios",
      autor_nome: autorNome || null,
    });

    setView("lista");
    carregar();
  }

  function parseConteudo(r: Relatorio): ConteudoABC | null {
    try { return JSON.parse(r.conteudo); } catch { return null; }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 transition bg-white";
  const labelClass = "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block";

  function OptGrid({ opcoes, selecionados, onToggle }: { opcoes: string[]; selecionados: string[]; onToggle: (v: string) => void }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opcoes.map((op) => {
          const ativo = selecionados.includes(op);
          return (
            <button key={op} type="button" onClick={() => onToggle(op)}
              className={`text-left px-3 py-2.5 rounded-xl border-2 text-xs leading-snug transition ${
                ativo ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}>
              {ativo ? "✓ " : ""}{op}
            </button>
          );
        })}
      </div>
    );
  }

  // =============================================
  // VIEW: NOVO REGISTRO
  // =============================================
  if (view === "novo") {
    const opcoesInterferentes = [...comportamentosAlvo, ...COMPORTAMENTOS_GENERICOS];

    return (
      <div className="space-y-5 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("lista")}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Registro ABC</h1>
            <p className="text-xs text-slate-400 mt-0.5">Acompanhamento pontual em sala — {autorNome}</p>
          </div>
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

        {/* Criança + comportamentos-alvo */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Criança</label>
              <select value={criancaId} onChange={(e) => setCriancaId(e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {criancas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Data</label>
              <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Comportamentos-alvo observados hoje</label>
            {comportamentosAlvo.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {comportamentosAlvo.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-100 pl-2.5 pr-1.5 py-1 rounded-full">
                    🎯 {c}
                    <button onClick={() => setComportamentosAlvo((prev) => prev.filter((_, j) => j !== i))}
                      className="w-3.5 h-3.5 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={novoAlvo} onChange={(e) => setNovoAlvo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarAlvo(); } }}
                placeholder="Adicionar comportamento observado..." className={inputClass} />
              <button onClick={adicionarAlvo} type="button"
                className="px-4 rounded-xl border-2 border-dashed border-red-200 text-red-700 text-xs font-bold hover:bg-red-50 transition shrink-0">
                + Adicionar
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Não precisa que já exista um Plano Terapêutico pra essa criança — esses registros, ao longo do tempo, é que embasam a reunião onde vocês e a Simone definem o plano.
            </p>
          </div>
        </div>

        {/* Entrada */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
          <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">🏁 Entrada</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Chegada</label>
              <input type="time" value={horaChegada} onChange={(e) => setHoraChegada(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Local</label>
              <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Sala de aula — Suporte 1" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Comportamento na entrada</label>
            <textarea rows={2} value={comportamentoEntrada} onChange={(e) => setComportamentoEntrada(e.target.value)}
              placeholder="Como a criança chegou..." className={`${inputClass} resize-none`} />
          </div>
        </div>

        {/* Períodos */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Períodos de aula</span>
          <span className="text-[11px] text-slate-400">{periodos.length} registrado{periodos.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-3">
          {periodos.map((p, idx) => {
            const aberto = periodoAberto === idx;
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setPeriodoAberto(aberto ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left">
                  <div className="w-7 h-7 rounded-lg bg-blue-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</div>
                  <input type="text" value={p.nome} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => atualizarPeriodo(idx, { nome: e.target.value })}
                    placeholder={`Período ${idx + 1} (ex: Português)`}
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400" />
                  <button onClick={(e) => { e.stopPropagation(); removerPeriodo(idx); }}
                    className="text-slate-400 hover:text-red-600 transition shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {aberto ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {aberto && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Horário</label>
                        <div className="flex items-center gap-2">
                          <input type="time" value={p.hora_inicio} onChange={(e) => atualizarPeriodo(idx, { hora_inicio: e.target.value })} className={inputClass} />
                          <span className="text-slate-300">–</span>
                          <input type="time" value={p.hora_fim} onChange={(e) => atualizarPeriodo(idx, { hora_fim: e.target.value })} className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Tempo de engajamento</label>
                        <input type="text" value={p.tempo_engajamento} onChange={(e) => atualizarPeriodo(idx, { tempo_engajamento: e.target.value })}
                          placeholder="Ex: cerca de 18 minutos" className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Atividade oferecida</label>
                      <select value={p.atividade_oferecida} onChange={(e) => atualizarPeriodo(idx, { atividade_oferecida: e.target.value })} className={inputClass}>
                        <option value="">Selecione...</option>
                        {ATIVIDADE_OFERECIDA.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-extrabold text-slate-700 mb-2">⚠️ Comportamentos interferentes observados</p>
                      <OptGrid opcoes={opcoesInterferentes} selecionados={p.comportamentos_interferentes}
                        onToggle={(v) => atualizarPeriodo(idx, { comportamentos_interferentes: toggleEm(p.comportamentos_interferentes, v) })} />
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-extrabold text-slate-700 mb-2">🧩 O que antecedeu</p>
                      <OptGrid opcoes={ANTECEDENTES} selecionados={p.antecedentes}
                        onToggle={(v) => atualizarPeriodo(idx, { antecedentes: toggleEm(p.antecedentes, v) })} />
                      <input type="text" value={p.antecedente_outro} onChange={(e) => atualizarPeriodo(idx, { antecedente_outro: e.target.value })}
                        placeholder="Outro antecedente (opcional)" className={`${inputClass} mt-2`} />
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-extrabold text-slate-700 mb-2">🛟 Consequência aplicada</p>
                      <OptGrid opcoes={CONSEQUENCIAS} selecionados={p.consequencia}
                        onToggle={(v) => atualizarPeriodo(idx, { consequencia: toggleEm(p.consequencia, v) })} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Duração da intervenção</label>
                        <input type="text" value={p.duracao_intervencao} onChange={(e) => atualizarPeriodo(idx, { duracao_intervencao: e.target.value })}
                          placeholder="Ex: ≈ 2 min" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Frequência no período</label>
                        <input type="number" min="0" value={p.frequencia} onChange={(e) => atualizarPeriodo(idx, { frequencia: e.target.value })} className={inputClass} />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-extrabold text-slate-700 mb-2">🛡️ Intervenções preventivas usadas</p>
                      <OptGrid opcoes={INTERVENCOES_PREVENTIVAS} selecionados={p.intervencoes_preventivas}
                        onToggle={(v) => atualizarPeriodo(idx, { intervencoes_preventivas: toggleEm(p.intervencoes_preventivas, v) })} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={adicionarPeriodo}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-bold hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition">
          + Adicionar período
        </button>

        {/* Observações livres */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-2">
          <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">✍️ Observações gerais</p>
          <p className="text-[11px] text-slate-400">Qualquer coisa que não coube nos campos acima.</p>
          <textarea rows={3} value={observacoesGerais} onChange={(e) => setObservacoesGerais(e.target.value)}
            placeholder="Escreva livremente aqui..." className={`${inputClass} resize-none`} />
        </div>

        {/* Rodapé fixo */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-w,0px)] bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 z-40">
          <span className="text-xs text-slate-400 mr-auto hidden sm:block">
            {periodos.length} período{periodos.length !== 1 ? "s" : ""} · {comportamentosAlvo.length} comportamento{comportamentosAlvo.length !== 1 ? "s" : ""}-alvo
          </span>
          <button onClick={() => setView("lista")}
            className="flex-1 sm:flex-none h-11 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !criancaId}
            className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
            {salvando ? "Enviando..." : "Enviar para Simone"}
          </button>
        </div>
      </div>
    );
  }

  // =============================================
  // VIEW: LISTA
  // =============================================
  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📝 Registro ABC</h1>
          <p className="text-xs text-slate-400 mt-0.5">Registre o que você observou quando ficou com uma criança.</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors self-start">
          <Plus className="h-4 w-4" /> Novo registro
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : relatorios.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText className="h-10 w-10 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 mt-2">Nenhum registro ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relatorios.map((r) => {
            const c = parseConteudo(r);
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.criancas?.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      {c?.local ? ` · ${c.local}` : ""}
                    </p>
                  </div>
                  {r.feedback_gestao && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Com feedback
                    </span>
                  )}
                </div>

                {c?.comportamentos_alvo && c.comportamentos_alvo.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.comportamentos_alvo.map((cp, i) => (
                      <span key={i} className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">🎯 {cp}</span>
                    ))}
                  </div>
                )}

                {c?.periodos && c.periodos.length > 0 && (
                  <p className="text-xs text-slate-500 mb-2">
                    {c.periodos.length} período{c.periodos.length !== 1 ? "s" : ""} registrado{c.periodos.length !== 1 ? "s" : ""}
                  </p>
                )}

                {c?.observacoes_gerais && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.observacoes_gerais}</p>
                )}

                {r.feedback_gestao && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-blue-50/50 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
                      Feedback de {r.feedback_por || "Gestão"}
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.feedback_gestao}</p>
                    {r.feedback_em && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(r.feedback_em).toLocaleDateString("pt-BR")}
                      </p>
                    )}
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
