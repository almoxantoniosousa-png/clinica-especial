"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check, Copy, ClipboardCheck } from "lucide-react";

type TipoEvento = "treino" | "reuniao" | "atendimento" | "espiritual" | "feriado" | "livre" | "outro";

const TIPOS: { valor: TipoEvento; label: string; emoji: string; cor: string; bg: string; border: string }[] = [
  { valor: "treino",      label: "Treinamento",  emoji: "🏋️", cor: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  { valor: "reuniao",     label: "Reunião",       emoji: "👥", cor: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200"    },
  { valor: "atendimento", label: "Atendimento",   emoji: "🧒", cor: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200"  },
  { valor: "espiritual",  label: "Espiritual",    emoji: "✝️", cor: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"   },
  { valor: "feriado",     label: "Feriado",       emoji: "🎉", cor: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200"    },
  { valor: "livre",       label: "Dia Livre",     emoji: "☀️", cor: "text-slate-500",   bg: "bg-slate-50",    border: "border-slate-200"   },
  { valor: "outro",       label: "Outro",         emoji: "📋", cor: "text-slate-700",   bg: "bg-slate-100",   border: "border-slate-200"   },
];

const MODALIDADES = [
  { valor: "presencial", label: "Presencial", emoji: "📍" },
  { valor: "online",     label: "Online",     emoji: "💻" },
  { valor: "",           label: "Sem local",  emoji: "—"  },
];

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type Evento = {
  id: string;
  data: string;
  hora: string | null;
  tipo: TipoEvento;
  titulo: string;
  modalidade: string | null;
  observacao: string | null;
};

type FormData = {
  data: string; hora: string; tipo: TipoEvento;
  titulo: string; modalidade: string; observacao: string;
};

const FORM_VAZIO: FormData = {
  data: new Date().toISOString().slice(0, 10),
  hora: "", tipo: "reuniao", titulo: "", modalidade: "", observacao: "",
};

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

function getSegunda(base: Date) {
  const d = new Date(base);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return d;
}

function tipoInfo(valor: TipoEvento) {
  return TIPOS.find(t => t.valor === valor) ?? TIPOS[TIPOS.length - 1];
}

export default function PautaSimonePage() {
  const [semanaBase, setSemanaBase] = useState<Date>(() => getSegunda(new Date()));
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaBase);
    d.setDate(semanaBase.getDate() + i);
    return toISO(d);
  }), [semanaBase]);

  const labelSemana = useMemo(() => {
    const ini = new Date(diasSemana[0] + "T12:00:00");
    const fim = new Date(diasSemana[6] + "T12:00:00");
    if (ini.getMonth() === fim.getMonth())
      return `${ini.getDate()} – ${fim.getDate()} de ${MESES_PT[ini.getMonth()]} ${ini.getFullYear()}`;
    return `${ini.getDate()} ${MESES_PT[ini.getMonth()].slice(0,3)} – ${fim.getDate()} ${MESES_PT[fim.getMonth()].slice(0,3)} ${fim.getFullYear()}`;
  }, [diasSemana]);

  useEffect(() => { carregar(); }, [semanaBase]);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("pauta_diretora")
      .select("*")
      .gte("data", diasSemana[0])
      .lte("data", diasSemana[6])
      .order("data").order("hora", { nullsFirst: true });
    setEventos((data || []) as Evento[]);
    setLoading(false);
  }

  function fb(tipo: "ok" | "err", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  function abrirNovo(data?: string) {
    setForm({ ...FORM_VAZIO, data: data ?? toISO(new Date()) });
    setEditando(null);
    setModal(true);
  }

  function abrirEdicao(ev: Evento) {
    setForm({
      data: ev.data, hora: ev.hora ?? "", tipo: ev.tipo,
      titulo: ev.titulo, modalidade: ev.modalidade ?? "", observacao: ev.observacao ?? "",
    });
    setEditando(ev);
    setModal(true);
  }

  function fechar() { setModal(false); setEditando(null); setForm(FORM_VAZIO); }

  async function salvar() {
    if (!form.titulo.trim() || !form.data) {
      fb("err", "Data e título são obrigatórios."); return;
    }
    setSalvando(true);
    const payload = {
      data: form.data,
      hora: form.hora || null,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      modalidade: form.modalidade || null,
      observacao: form.observacao.trim() || null,
    };
    const { error } = editando
      ? await supabase.from("pauta_diretora").update(payload).eq("id", editando.id)
      : await supabase.from("pauta_diretora").insert([payload]);
    if (error) fb("err", "Erro: " + error.message);
    else { fb("ok", editando ? "Evento atualizado!" : "Evento adicionado!"); fechar(); await carregar(); }
    setSalvando(false);
  }

  async function deletar(id: string) {
    await supabase.from("pauta_diretora").delete().eq("id", id);
    setEventos(prev => prev.filter(e => e.id !== id));
    setConfirmDelete(null);
    fb("ok", "Removido.");
  }

  function gerarTexto(): string {
    const hoje = toISO(new Date());
    const linhas: string[] = [];
    diasSemana.forEach(dia => {
      const evsDia = eventos.filter(e => e.data === dia);
      const d = new Date(dia + "T12:00:00");
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const aaaa = d.getFullYear();
      linhas.push(`${DIAS_FULL[d.getDay()]}`);
      linhas.push(`${dd}.${mm}.${aaaa}`);
      if (evsDia.length === 0) {
        linhas.push("✅ Nada Agendado");
      } else {
        evsDia.forEach(ev => {
          const t = tipoInfo(ev.tipo);
          const hora = ev.hora ? `${ev.hora} horas ` : "";
          const modal = ev.modalidade === "online" ? " Online" : ev.modalidade === "presencial" ? " Presencial" : "";
          linhas.push(`✅ ${hora}${ev.titulo}${modal}`);
        });
      }
      if (dia !== diasSemana[6]) linhas.push("");
    });
    return linhas.join("\n");
  }

  function copiar() {
    navigator.clipboard.writeText(gerarTexto()).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  const inputCls = "w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5 pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pauta Semanal</h1>
          <p className="text-xs text-slate-400 mt-0.5">Agenda de Simone — organizada por Fátima</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copiar}
            className={`flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border transition ${
              copiado ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {copiado ? <><ClipboardCheck className="h-3.5 w-3.5"/> Copiado!</> : <><Copy className="h-3.5 w-3.5"/> Copiar pauta</>}
          </button>
          <button onClick={() => abrirNovo()}
            className="flex items-center gap-1.5 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus className="h-4 w-4"/> Novo evento
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
          feedback.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {feedback.tipo === "ok" ? "✓" : "✕"} {feedback.msg}
        </div>
      )}

      {/* Navegação de semana */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate()-7); setSemanaBase(d); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition">
            <ChevronLeft className="h-4 w-4 text-slate-600"/>
          </button>
          <span className="text-sm font-semibold text-slate-700">{labelSemana}</span>
          <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate()+7); setSemanaBase(d); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition">
            <ChevronRight className="h-4 w-4 text-slate-600"/>
          </button>
        </div>

        {/* Mini header dos dias */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {diasSemana.map(dia => {
            const d = new Date(dia + "T12:00:00");
            const hoje = toISO(new Date());
            const isHoje = dia === hoje;
            const temEvento = eventos.some(e => e.data === dia);
            return (
              <button key={dia} onClick={() => abrirNovo(dia)}
                className={`flex flex-col items-center py-2 gap-0.5 transition hover:bg-slate-50 ${isHoje ? "bg-blue-50" : ""}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${isHoje ? "text-blue-600" : "text-slate-400"}`}>
                  {DIAS_PT[d.getDay()]}
                </span>
                <span className={`text-sm font-bold leading-none ${isHoje ? "text-blue-700" : "text-slate-700"}`}>
                  {d.getDate()}
                </span>
                {temEvento && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5"/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de eventos por dia */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-400">Carregando pauta...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {diasSemana.map(dia => {
            const d = new Date(dia + "T12:00:00");
            const evsDia = eventos.filter(e => e.data === dia);
            const hoje = toISO(new Date());
            const isHoje = dia === hoje;

            return (
              <div key={dia} className={`rounded-2xl border overflow-hidden shadow-sm ${isHoje ? "border-blue-200" : "border-slate-200"}`}>
                {/* Header do dia */}
                <div className={`flex items-center justify-between px-4 py-3 ${isHoje ? "bg-blue-50" : "bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl font-bold ${
                      isHoje ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      <span className="text-xs leading-none uppercase">{DIAS_PT[d.getDay()]}</span>
                      <span className="text-base leading-none">{d.getDate()}</span>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isHoje ? "text-blue-800" : "text-slate-800"}`}>
                        {DIAS_FULL[d.getDay()]}
                      </p>
                      <p className="text-xs text-slate-400">
                        {String(d.getDate()).padStart(2,"0")}.{String(d.getMonth()+1).padStart(2,"0")}.{d.getFullYear()}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => abrirNovo(dia)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 transition text-sm font-bold">
                    +
                  </button>
                </div>

                {/* Eventos do dia */}
                <div className="bg-white divide-y divide-slate-50">
                  {evsDia.length === 0 ? (
                    <div className="px-4 py-3 flex items-center gap-2">
                      <span className="text-base">☀️</span>
                      <span className="text-xs text-slate-400 italic">Nada agendado — clique no + para adicionar</span>
                    </div>
                  ) : (
                    evsDia.map(ev => {
                      const t = tipoInfo(ev.tipo);
                      return (
                        <div key={ev.id} className="px-4 py-3 flex items-center gap-3 group">
                          {/* Hora */}
                          <div className="w-12 flex-shrink-0 text-center">
                            {ev.hora ? (
                              <span className="text-sm font-bold text-slate-700">{ev.hora}</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </div>

                          {/* Separador */}
                          <div className="w-px bg-slate-100 self-stretch flex-shrink-0"/>

                          {/* Tipo badge + título */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${t.bg} ${t.cor} ${t.border}`}>
                                {t.emoji} {t.label}
                              </span>
                              {ev.modalidade && (
                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                  {ev.modalidade === "online" ? "💻 Online" : "📍 Presencial"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-slate-800 mt-1 truncate">{ev.titulo}</p>
                            {ev.observacao && <p className="text-xs text-slate-400 italic mt-0.5 truncate">{ev.observacao}</p>}
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                            <button onClick={() => abrirEdicao(ev)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 transition">
                              <Pencil className="h-3 w-3"/>
                            </button>
                            {confirmDelete === ev.id ? (
                              <>
                                <button onClick={() => deletar(ev.id)} className="h-7 px-2 text-xs font-bold bg-red-500 text-white rounded-lg">Sim</button>
                                <button onClick={() => setConfirmDelete(null)} className="h-7 px-2 text-xs bg-slate-100 text-slate-600 rounded-lg">Não</button>
                              </>
                            ) : (
                              <button onClick={() => setConfirmDelete(ev.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-500 transition">
                                <Trash2 className="h-3 w-3"/>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) fechar(); }}>
          <div className="w-full sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

            {/* Header do modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{editando ? "Editar evento" : "Novo evento"}</h2>
                <p className="text-xs text-slate-400">Pauta de Simone</p>
              </div>
              <button onClick={fechar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500"/>
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5 flex-1">

              {/* Tipo do evento */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de evento</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS.map(t => (
                    <button key={t.valor} onClick={() => setForm(f => ({ ...f, tipo: t.valor }))}
                      className={`flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-semibold transition ${
                        form.tipo === t.valor
                          ? `${t.bg} ${t.cor} ${t.border} ring-2 ring-offset-1 ring-current`
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Reunião com Sra. Fernanda (Mãe de Enzo)"
                  className={inputCls}
                />
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data *</label>
                  <input type="date" value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={inputCls}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horário</label>
                  <input type="time" value={form.hora}
                    onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} className={inputCls}
                    placeholder="Opcional"/>
                </div>
              </div>

              {/* Modalidade */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Local</label>
                <div className="flex gap-2">
                  {MODALIDADES.map(m => (
                    <button key={m.valor} onClick={() => setForm(f => ({ ...f, modalidade: m.valor }))}
                      className={`flex-1 h-9 rounded-xl border text-xs font-semibold transition ${
                        form.modalidade === m.valor
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observação */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observação</label>
                <textarea value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  rows={2} placeholder="Opcional..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"/>
              </div>
            </div>

            {/* Footer do modal */}
            <div className="p-5 pt-0 flex gap-3 shrink-0">
              <button onClick={fechar} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {salvando ? "Salvando..." : <><Check className="h-4 w-4"/> {editando ? "Salvar" : "Adicionar"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
