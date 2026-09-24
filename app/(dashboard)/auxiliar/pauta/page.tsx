"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Trash2, X, Check, Copy, ClipboardCheck } from "lucide-react";
import { paraISOLocal } from "@/lib/dataUtils";

// ── Cards de tipo de evento ──────────────────────────────────────────────────

type Tipo =
  | "treino" | "atend_clinica" | "atend_casa" | "atend_escola" | "reuniao" | "supervisao"
  | "espiritual" | "atividade_fisica" | "medico" | "salao" | "pet" | "feriado";

type CardDef = {
  tipo: Tipo; label: string; emoji: string;
  bg: string; ring: string; placeholder: string; grupo: "clinica" | "pessoal";
  oculto?: boolean; // não aparece como card na grade, só existe pra eventos já salvos com esse tipo
};

// "Atendimento" é um card só (era 3: Clínica/Casa/Escola) — o local vira um
// seletor dentro do modal, pra não ocupar 3 espaços na grade.
const LOCAIS_ATENDIMENTO: { tipo: Tipo; label: string }[] = [
  { tipo: "atend_clinica", label: "Clínica" },
  { tipo: "atend_casa",    label: "Casa" },
  { tipo: "atend_escola",  label: "Escola" },
];

const CARDS: CardDef[] = [
  // Agenda da Clínica
  { tipo: "atend_clinica",    label: "Atendimento",      emoji: "🏥", bg: "bg-blue-500",    ring: "ring-blue-400",    placeholder: "Nome da criança / paciente",     grupo: "clinica" },
  { tipo: "supervisao",       label: "Supervisão",       emoji: "🔎", bg: "bg-indigo-500",  ring: "ring-indigo-400",  placeholder: "Equipe / local supervisionado",  grupo: "clinica" },
  // "Reunião" não é mais um card — vira só um texto/título dentro de qualquer outra categoria.
  { tipo: "reuniao",          label: "Reunião",          emoji: "👥", bg: "bg-sky-500",     ring: "ring-sky-400",     placeholder: "Com quem / sobre o quê",         grupo: "clinica", oculto: true },
  // Agenda Pessoal
  // "Treinamento" (tipo "treino") foi unificado com "Atividade Física" — não é
  // mais um card; eventos antigos salvos com esse tipo são tratados em cardInfo().
  { tipo: "espiritual",       label: "Espiritual",       emoji: "✝️", bg: "bg-amber-500",   ring: "ring-amber-400",   placeholder: "Ex: Reunião Sto Antônio, culto", grupo: "pessoal" },
  { tipo: "atividade_fisica", label: "Atividade Física", emoji: "🏃‍♀️", bg: "bg-teal-500",   ring: "ring-teal-400",    placeholder: "Ex: Academia, pilates, corrida", grupo: "pessoal" },
  { tipo: "medico",           label: "Médico",           emoji: "🩺", bg: "bg-red-400",     ring: "ring-red-300",     placeholder: "Especialidade / clínica",        grupo: "pessoal" },
  { tipo: "salao",            label: "Salão",            emoji: "💇‍♀️", bg: "bg-pink-500",   ring: "ring-pink-400",    placeholder: "Nome do salão / serviço",        grupo: "pessoal" },
  { tipo: "pet",              label: "Pet",              emoji: "🐾", bg: "bg-orange-400",  ring: "ring-orange-300",  placeholder: "Nome do pet / o que é",          grupo: "pessoal" },
  { tipo: "feriado",          label: "Feriado / Livre",  emoji: "🎉", bg: "bg-rose-400",    ring: "ring-rose-300",    placeholder: "Nome do feriado (opcional)",     grupo: "pessoal" },
];

const CARDS_CLINICA = CARDS.filter(c => c.grupo === "clinica" && !c.oculto);
const CARDS_PESSOAL = CARDS.filter(c => c.grupo === "pessoal" && !c.oculto);

const GRUPOS_AGENDA = [
  { id: "clinica" as const, label: "Agenda da Clínica", curto: "Clínica", emoji: "🏥", border: "border-blue-100", bg: "bg-blue-50/60", text: "text-blue-900", ativo: "bg-blue-700", cards: CARDS_CLINICA },
  { id: "pessoal" as const, label: "Agenda Pessoal",     curto: "Pessoal", emoji: "🤍", border: "border-rose-100", bg: "bg-rose-50/60", text: "text-rose-900", ativo: "bg-rose-600", cards: CARDS_PESSOAL },
];

function ehAtendimento(tipo: string) {
  return tipo === "atend_clinica" || tipo === "atend_casa" || tipo === "atend_escola";
}

function localAtendimento(tipo: string) {
  return LOCAIS_ATENDIMENTO.find(l => l.tipo === tipo)?.label ?? null;
}

// Eventos antigos salvos como atend_casa/atend_escola continuam existindo —
// mostram com a cara do card "Atendimento" (unificado), só o local muda.
// Eventos antigos salvos como "treino" mostram com a cara de "Atividade Física" (unificados).
function cardInfo(tipo: string) {
  if (ehAtendimento(tipo)) {
    const base = CARDS.find(c => c.tipo === "atend_clinica")!;
    return base;
  }
  if (tipo === "treino") {
    return CARDS.find(c => c.tipo === "atividade_fisica")!;
  }
  return CARDS.find(c => c.tipo === tipo) ?? { label: tipo, emoji: "📋", bg: "bg-slate-400", ring: "ring-slate-300", placeholder: "", grupo: "clinica" as const };
}

// ── Tipos ────────────────────────────────────────────────────────────────────

type Evento = {
  id: string; data: string; hora: string | null; hora_fim: string | null;
  tipo: Tipo; titulo: string; status: string; obs_simone: string | null;
};

// ── Helpers de data ──────────────────────────────────────────────────────────

const DIAS_FULL = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MESES     = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function toISO(d: Date) { return paraISOLocal(d); }
function getSegunda(base: Date) {
  const d = new Date(base); const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow)); d.setHours(0,0,0,0); return d;
}
function fmt(dia: string) {
  const d = new Date(dia + "T12:00:00");
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function AgendaSimonePage() {
  const [semanaBase, setSemanaBase] = useState<Date>(() => getSegunda(new Date()));
  const [grupoAberto, setGrupoAberto] = useState<"clinica" | "pessoal">("clinica");
  // Dia selecionado na faixa de dias (começa em hoje). Só os compromissos
  // dele aparecem embaixo, pra não virar uma lista gigante de rolar.
  const [diaAberto, setDiaAberto] = useState<string>(toISO(new Date()));
  const [eventos, setEventos]       = useState<Evento[]>([]);
  const [loading, setLoading]       = useState(true);
  const [copiado, setCopiado]       = useState(false);
  const [historicoTitulos, setHistoricoTitulos] = useState<{ tipo: string; titulo: string }[]>([]);

  // Modal
  const [tipoSelecionado, setTipoSelecionado] = useState<Tipo | null>(null);
  const [editando, setEditando]               = useState<Evento | null>(null);
  const [data,     setData]                   = useState(toISO(new Date()));
  const [horaIni,  setHoraIni]                = useState("");
  const [horaFim,  setHoraFim]                = useState("");
  const [comQuem,  setComQuem]                = useState("");
  const [salvando, setSalvando]               = useState(false);
  const [erro,     setErro]                   = useState("");

  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaBase); d.setDate(semanaBase.getDate() + i); return toISO(d);
  }), [semanaBase]);

  const labelSemana = useMemo(() => {
    const ini = new Date(diasSemana[0] + "T12:00:00");
    const fim = new Date(diasSemana[6] + "T12:00:00");
    if (ini.getMonth() === fim.getMonth())
      return `${ini.getDate()} – ${fim.getDate()} de ${MESES[ini.getMonth()]} ${ini.getFullYear()}`;
    return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0,3)} – ${fim.getDate()} ${MESES[fim.getMonth()].slice(0,3)} ${fim.getFullYear()}`;
  }, [diasSemana]);

  useEffect(() => { carregar(); }, [semanaBase]);

  // Carrega uma vez só, pra sugerir (autocompletar) nomes já digitados antes — não precisa repetir "com quem" toda vez
  useEffect(() => {
    supabase.from("pauta_diretora").select("tipo, titulo").then(({ data }) => setHistoricoTitulos((data || []) as { tipo: string; titulo: string }[]));
  }, []);

  const sugestoesPorTipo = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    historicoTitulos.forEach(({ tipo, titulo }) => {
      if (!titulo) return;
      if (!mapa[tipo]) mapa[tipo] = [];
      if (!mapa[tipo].includes(titulo)) mapa[tipo].push(titulo);
    });
    return mapa;
  }, [historicoTitulos]);

  async function carregar() {
    setLoading(true);
    const { data: rows } = await supabase
      .from("pauta_diretora").select("*")
      .gte("data", diasSemana[0]).lte("data", diasSemana[6])
      .order("data").order("hora", { nullsFirst: true });
    setEventos((rows || []) as Evento[]);
    setLoading(false);
  }

  // Abrir modal para novo evento
  function abrirNovo(tipo: Tipo, diaBase?: string) {
    setEditando(null);
    setTipoSelecionado(tipo);
    setData(diaBase ?? toISO(new Date()));
    setHoraIni(""); setHoraFim(""); setComQuem(""); setErro("");
  }

  // Abrir modal para editar
  function abrirEditar(ev: Evento) {
    setEditando(ev);
    setTipoSelecionado(ev.tipo);
    setData(ev.data); setHoraIni(ev.hora ?? ""); setHoraFim(ev.hora_fim ?? "");
    setComQuem(ev.titulo); setErro("");
  }

  function fechar() { setTipoSelecionado(null); setEditando(null); }

  async function salvar() {
    if (!data) { setErro("Escolha a data."); return; }
    const card = cardInfo(tipoSelecionado!);
    // Para feriado/espiritual o "com quem" é opcional — usa o label como fallback
    const titulo = comQuem.trim() || card.label;
    setSalvando(true);
    const payload = {
      data, hora: horaIni || null, hora_fim: horaFim || null,
      tipo: tipoSelecionado, titulo,
    };
    const { error } = editando
      ? await supabase.from("pauta_diretora").update(payload).eq("id", editando.id)
      : await supabase.from("pauta_diretora").insert([payload]);
    if (error) { setErro("Erro ao salvar. Tente novamente."); setSalvando(false); return; }
    fechar(); await carregar();
    setSalvando(false);
  }

  async function deletar(id: string) {
    await supabase.from("pauta_diretora").delete().eq("id", id);
    setEventos(prev => prev.filter(e => e.id !== id));
  }

  // Gerar texto para copiar
  function gerarTexto() {
    return diasSemana.map(dia => {
      const d = new Date(dia + "T12:00:00");
      const evs = eventos.filter(e => e.data === dia);
      const cabecalho = `${DIAS_FULL[d.getDay()]}\n${fmt(dia)}`;
      if (evs.length === 0) return `${cabecalho}\n✅ Nada Agendado`;
      const linhas = evs.map(ev => {
        const card = cardInfo(ev.tipo);
        const hora = ev.hora ? `${ev.hora}${ev.hora_fim ? ` às ${ev.hora_fim}` : ""} horas ` : "";
        return `✅ ${hora}${ev.titulo}`;
      });
      return `${cabecalho}\n${linhas.join("\n")}`;
    }).join("\n\n");
  }

  function copiar() {
    navigator.clipboard.writeText(gerarTexto()).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2500);
    });
  }

  const modal = tipoSelecionado !== null;
  const card  = modal ? cardInfo(tipoSelecionado!) : null;

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda de Simone</h1>
          <p className="text-xs text-slate-400 mt-0.5">Clique em um card para adicionar à semana</p>
        </div>
        <button onClick={copiar}
          className={`flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border transition ${
            copiado ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}>
          {copiado ? <><ClipboardCheck className="h-3.5 w-3.5"/> Copiado!</> : <><Copy className="h-3.5 w-3.5"/> Copiar pauta</>}
        </button>
      </div>

      {/* Abas Clínica | Pessoal — as duas ficam sempre no lugar, lado a lado;
          a que está em uso só ganha destaque. (Antes a aberta ocupava a
          largura toda e empurrava a outra pra baixo, parecendo que sumia.) */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Agenda da clínica ou pessoal">
          {GRUPOS_AGENDA.map(grupo => {
            const ativo = grupoAberto === grupo.id;
            return (
              <button key={grupo.id} type="button" role="tab" aria-selected={ativo} onClick={() => setGrupoAberto(grupo.id)}
                className={`rounded-2xl px-4 py-3 flex items-center justify-between gap-2 text-sm font-bold border transition-colors
                  ${ativo ? `${grupo.ativo} text-white border-transparent shadow-md` : `${grupo.bg} ${grupo.border} ${grupo.text} hover:brightness-95`}`}>
                <span className="truncate">{grupo.emoji} <span className="sm:hidden">{grupo.curto}</span><span className="hidden sm:inline">{grupo.label}</span></span>
                {ativo && <span className="hidden sm:inline text-[10px] font-extrabold uppercase tracking-wider bg-white/20 rounded-full px-2 py-0.5 flex-shrink-0">em uso</span>}
              </button>
            );
          })}
        </div>
        {(() => {
          const grupo = GRUPOS_AGENDA.find(g => g.id === grupoAberto)!;
          return (
            <div className={`rounded-2xl border ${grupo.border} ${grupo.bg} p-3 grid grid-cols-2 sm:grid-cols-4 gap-3`} role="tabpanel">
              {grupo.cards.map(c => (
                <button key={c.tipo} onClick={() => abrirNovo(c.tipo)}
                  className={`${c.bg} text-white rounded-2xl p-4 flex flex-col items-start gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all`}>
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-sm font-bold leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Navegação de semana */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate()-7); setSemanaBase(d); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4 text-slate-600"/>
        </button>
        <span className="text-sm font-semibold text-slate-700">{labelSemana}</span>
        <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate()+7); setSemanaBase(d); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
          <ChevronRight className="h-4 w-4 text-slate-600"/>
        </button>
      </div>

      {/* Dias da semana — faixa fixa com os 7 dias, todos do mesmo tamanho;
          o dia escolhido ganha destaque e os compromissos dele aparecem
          embaixo, na largura toda. (Antes cada dia abria dentro da própria
          caixa, a grade ficava com alturas diferentes e buracos, e o título
          dos compromissos era cortado.) */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>
      ) : (() => {
        const hoje = toISO(new Date());
        const diaSel = diasSemana.includes(diaAberto) ? diaAberto : (diasSemana.includes(hoje) ? hoje : diasSemana[0]);
        const dSel = new Date(diaSel + "T12:00:00");
        const evsSel = eventos.filter(e => e.data === diaSel);
        const selSemNadaEFuturo = evsSel.length === 0 && diaSel >= hoje;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1 sm:gap-2" role="tablist" aria-label="Dias da semana">
              {diasSemana.map(dia => {
                const d = new Date(dia + "T12:00:00");
                const n = eventos.filter(e => e.data === dia).length;
                const ativo = dia === diaSel;
                const ehHoje = dia === hoje;
                const definir = n === 0 && dia >= hoje;
                return (
                  <button key={dia} type="button" role="tab" aria-selected={ativo} onClick={() => setDiaAberto(dia)}
                    className={`rounded-xl sm:rounded-2xl border px-0.5 sm:px-2 py-2 sm:py-2.5 flex flex-col items-center gap-0.5 transition-colors min-w-0
                      ${ativo ? "bg-blue-700 border-transparent text-white shadow-md" : ehHoje ? "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${ativo ? "text-blue-100" : "text-slate-400"}`}>
                      {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d.getDay()]}{ehHoje && <span className="hidden sm:inline"> · hoje</span>}
                    </span>
                    <span className="text-lg font-extrabold leading-none tabular-nums">{d.getDate()}</span>
                    <span className={`text-[10px] font-bold rounded-full px-1.5 min-w-[1.25rem] text-center
                      ${ativo ? "bg-white/20 text-white" : definir ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {definir ? <><span className="sm:hidden">!</span><span className="hidden sm:inline">definir</span></> : n}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden" role="tabpanel">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-50 border-b border-blue-100">
                <p className="text-sm font-bold text-blue-900">{DIAS_FULL[dSel.getDay()]} · {fmt(diaSel)}</p>
                <span className="text-xs font-semibold text-blue-700">{evsSel.length} compromisso{evsSel.length === 1 ? "" : "s"}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {evsSel.length === 0 ? (
                  selSemNadaEFuturo ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50">
                      <span className="text-amber-500">⚠️</span>
                      <p className="text-xs text-amber-700 font-medium">Nenhum compromisso definido ainda pra este dia.</p>
                    </div>
                  ) : (
                    <p className="px-4 py-3 text-xs text-slate-400 italic">Nada agendado</p>
                  )
                ) : evsSel.map(ev => {
                  const c          = cardInfo(ev.tipo);
                  const naoFeito   = ev.status === "nao_realizado";
                  const realizado  = ev.status === "realizado";
                  return (
                    <div key={ev.id} className={`px-4 py-3 space-y-2 group ${naoFeito ? "bg-red-50/60" : ""}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center text-base flex-shrink-0`}>
                          {c.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-sm font-semibold ${realizado ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {ev.titulo}
                            </p>
                            {localAtendimento(ev.tipo) && (
                              <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">{localAtendimento(ev.tipo)}</span>
                            )}
                          </div>
                          {(ev.hora || ev.hora_fim) && (
                            <p className="text-xs text-slate-400">
                              {ev.hora}{ev.hora_fim ? ` às ${ev.hora_fim}` : ""}
                            </p>
                          )}
                        </div>
                        {/* Badge de status */}
                        {realizado && <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">✓ Feito</span>}
                        {naoFeito  && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">⚠ Remarcar</span>}
                        {/* Ações — no celular ficam sempre visíveis (lá não existe "passar o mouse") */}
                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition flex-shrink-0">
                          <button onClick={() => abrirEditar(ev)}
                            className="text-xs px-2 h-7 bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 rounded-lg transition">
                            Editar
                          </button>
                          <button onClick={() => deletar(ev.id)} aria-label="Excluir compromisso"
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400 rounded-lg transition">
                            <Trash2 className="h-3.5 w-3.5"/>
                          </button>
                        </div>
                      </div>
                      {/* Recado de Simone pedindo remarcação */}
                      {naoFeito && (
                        <div className="flex items-start gap-2 px-3 py-2 bg-red-100 rounded-xl">
                          <span className="text-red-500 text-xs mt-0.5">💬</span>
                          <p className="text-xs text-red-700 font-medium">
                            {ev.obs_simone || "Simone não realizou este compromisso. Remarque um novo horário."}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal */}
      {modal && card && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) fechar(); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Header colorido */}
            <div className={`${card.bg} px-5 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{card.emoji}</span>
                <p className="text-white font-bold text-base">{card.label}</p>
              </div>
              <button onClick={fechar} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition">
                <X className="h-4 w-4 text-white"/>
              </button>
            </div>

            <div className="p-5 space-y-4">

              {/* Local (só para Atendimento) */}
              {ehAtendimento(tipoSelecionado!) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Local do atendimento</label>
                  <div className="flex gap-2">
                    {LOCAIS_ATENDIMENTO.map(l => (
                      <button key={l.tipo} type="button" onClick={() => setTipoSelecionado(l.tipo)}
                        className={`flex-1 h-10 rounded-xl text-sm font-semibold border transition ${
                          tipoSelecionado === l.tipo ? `${card.bg} text-white border-transparent` : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
              </div>

              {/* Horário */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horário</label>
                <div className="flex items-center gap-2">
                  <input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
                  <span className="text-slate-400 text-sm font-medium">às</span>
                  <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
                </div>
              </div>

              {/* Com quem */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Com quem / O quê</label>
                <input type="text" value={comQuem} onChange={e => setComQuem(e.target.value)}
                  placeholder={card.placeholder} list="sugestoes-com-quem"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  autoFocus/>
                <datalist id="sugestoes-com-quem">
                  {(sugestoesPorTipo[tipoSelecionado!] || []).map(t => <option key={t} value={t}/>)}
                </datalist>
              </div>

              {erro && <p className="text-xs text-red-500 font-medium">{erro}</p>}

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <button onClick={fechar} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando}
                  className={`flex-1 h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${card.bg} hover:opacity-90`}>
                  {salvando ? "Salvando..." : <><Check className="h-4 w-4"/> {editando ? "Salvar" : "Adicionar"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
