"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Check, X, MessageSquare } from "lucide-react";

const CARDS: Record<string, { label: string; emoji: string; bg: string }> = {
  treino:        { label: "Treinamento",    emoji: "🏋️", bg: "bg-emerald-500" },
  atend_clinica: { label: "Atend. Clínica", emoji: "🏥", bg: "bg-blue-500"    },
  atend_casa:    { label: "Atend. Casa",    emoji: "🏠", bg: "bg-violet-500"  },
  atend_escola:  { label: "Atend. Escola",  emoji: "🏫", bg: "bg-orange-500"  },
  espiritual:    { label: "Espiritual",     emoji: "✝️", bg: "bg-amber-500"   },
  reuniao:       { label: "Reunião",        emoji: "👥", bg: "bg-sky-500"     },
  supervisao:    { label: "Supervisão",     emoji: "🔎", bg: "bg-indigo-500"  },
  feriado:       { label: "Feriado / Livre",emoji: "🎉", bg: "bg-rose-400"    },
};

function info(tipo: string) {
  return CARDS[tipo] ?? { label: tipo, emoji: "📋", bg: "bg-slate-400" };
}

type Evento = {
  id: string; data: string; hora: string | null; hora_fim: string | null;
  tipo: string; titulo: string; status: string; obs_simone: string | null;
};

const DIAS_FULL = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MESES     = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function getSegunda(base: Date) {
  const d = new Date(base); const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow)); d.setHours(0,0,0,0); return d;
}
function fmt(dia: string) {
  const d = new Date(dia + "T12:00:00");
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}

export default function MinhaAgendaPage() {
  const [semanaBase, setSemanaBase] = useState<Date>(() => getSegunda(new Date()));
  const [eventos, setEventos]       = useState<Evento[]>([]);
  const [loading, setLoading]       = useState(true);
  // obs aberta para "não realizei"
  const [obsAberta, setObsAberta]   = useState<string | null>(null);
  const [obsTexto, setObsTexto]     = useState("");
  const [salvando, setSalvando]     = useState<string | null>(null);

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

  async function carregar() {
    setLoading(true);
    const { data: rows } = await supabase
      .from("pauta_diretora").select("*")
      .gte("data", diasSemana[0]).lte("data", diasSemana[6])
      .order("data").order("hora", { nullsFirst: true });
    setEventos((rows || []) as Evento[]);
    setLoading(false);
  }

  async function marcarRealizado(id: string) {
    setSalvando(id);
    await supabase.from("pauta_diretora").update({ status: "realizado", obs_simone: null }).eq("id", id);
    setEventos(prev => prev.map(e => e.id === id ? { ...e, status: "realizado", obs_simone: null } : e));
    setSalvando(null);
  }

  async function marcarNaoRealizado(id: string) {
    setSalvando(id);
    const obs = obsTexto.trim() || null;
    const ev  = eventos.find(e => e.id === id);
    await supabase.from("pauta_diretora").update({ status: "nao_realizado", obs_simone: obs }).eq("id", id);
    setEventos(prev => prev.map(e => e.id === id ? { ...e, status: "nao_realizado", obs_simone: obs } : e));
    if (ev) await notificarFatima(ev, obs);
    setObsAberta(null); setObsTexto(""); setSalvando(null);
  }

  async function notificarFatima(ev: Evento, obs: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: simone }, { data: fatima }] = await Promise.all([
      supabase.from("usuarios").select("id, nome").eq("email", user.email).maybeSingle(),
      supabase.from("usuarios").select("id").eq("role", "aux_adm").maybeSingle(),
    ]);
    if (!simone || !fatima) return;

    // Busca ou cria conversa entre Simone e Fátima
    const { data: existente } = await supabase
      .from("conversas").select("id")
      .or(`and(participante_a.eq.${simone.id},participante_b.eq.${fatima.id}),and(participante_a.eq.${fatima.id},participante_b.eq.${simone.id})`)
      .maybeSingle();

    let conversa_id = existente?.id;
    if (!conversa_id) {
      const { data: nova } = await supabase
        .from("conversas")
        .insert({ tipo: "privado", participante_a: simone.id, participante_b: fatima.id })
        .select("id").single();
      conversa_id = nova?.id;
    }
    if (!conversa_id) return;

    const c    = info(ev.tipo);
    const hora = ev.hora ? ` — ${ev.hora}${ev.hora_fim ? ` às ${ev.hora_fim}` : ""}` : "";
    const texto = `⚠️ Compromisso não realizado: ${c.emoji} ${ev.titulo}${hora}${obs ? `\n💬 ${obs}` : "\nPor favor, remarque um novo horário."}`;

    await supabase.from("mensagens_chat").insert({
      conversa_id,
      autor_id: simone.id,
      conteudo: texto,
    });
  }

  async function desfazer(id: string) {
    await supabase.from("pauta_diretora").update({ status: "pendente", obs_simone: null }).eq("id", id);
    setEventos(prev => prev.map(e => e.id === id ? { ...e, status: "pendente", obs_simone: null } : e));
  }

  const hoje = toISO(new Date());

  return (
    <div className="space-y-5 pb-12">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Minha Agenda</h1>
        <p className="text-xs text-slate-400 mt-0.5">Confirme cada compromisso após realizá-lo</p>
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

      {/* Eventos */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Carregando agenda...</p>
      ) : (
        <div className="space-y-4">
          {diasSemana.map(dia => {
            const d   = new Date(dia + "T12:00:00");
            const evs = eventos.filter(e => e.data === dia);
            return (
              <div key={dia} className={`rounded-2xl border overflow-hidden ${dia === hoje ? "border-blue-300" : "border-slate-200"}`}>
                {/* Cabeçalho do dia */}
                <div className={`flex items-center gap-3 px-4 py-2.5 ${dia === hoje ? "bg-blue-50" : "bg-slate-50"}`}>
                  <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold text-xs leading-none ${
                    dia === hoje ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}>
                    <span className="uppercase text-[10px]">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d.getDay()]}</span>
                    <span className="text-sm">{d.getDate()}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${dia === hoje ? "text-blue-800" : "text-slate-700"}`}>
                      {DIAS_FULL[d.getDay()]}
                    </p>
                    <p className="text-xs text-slate-400">{fmt(dia)}</p>
                  </div>
                </div>

                {/* Lista */}
                <div className="bg-white divide-y divide-slate-50">
                  {evs.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400 italic">Nada agendado</p>
                  ) : evs.map(ev => {
                    const c         = info(ev.tipo);
                    const realizado = ev.status === "realizado";
                    const naoFeito  = ev.status === "nao_realizado";
                    const pendente  = ev.status === "pendente";
                    const obsEsteAberta = obsAberta === ev.id;

                    return (
                      <div key={ev.id} className={`px-4 py-4 space-y-3 ${naoFeito ? "bg-red-50/60" : realizado ? "bg-emerald-50/40" : ""}`}>

                        {/* Linha do evento */}
                        <div className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                            {c.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${realizado ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {ev.titulo}
                            </p>
                            {(ev.hora || ev.hora_fim) && (
                              <p className="text-xs text-slate-400">
                                {ev.hora}{ev.hora_fim ? ` às ${ev.hora_fim}` : ""}
                              </p>
                            )}
                          </div>
                          {/* Badge de status */}
                          {realizado && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex-shrink-0">
                              <Check className="h-3 w-3"/> Realizado
                            </span>
                          )}
                          {naoFeito && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2.5 py-1 rounded-full flex-shrink-0">
                              <X className="h-3 w-3"/> Não realizado
                            </span>
                          )}
                        </div>

                        {/* Nota de Simone quando não realizado */}
                        {naoFeito && ev.obs_simone && (
                          <div className="flex items-start gap-2 px-3 py-2 bg-red-100 rounded-xl">
                            <MessageSquare className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0"/>
                            <p className="text-xs text-red-700">{ev.obs_simone}</p>
                          </div>
                        )}

                        {/* Ações */}
                        {pendente && (
                          <div className="flex gap-2">
                            <button onClick={() => marcarRealizado(ev.id)} disabled={salvando === ev.id}
                              className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition disabled:opacity-50">
                              <Check className="h-3.5 w-3.5"/> Realizado
                            </button>
                            <button onClick={() => { setObsAberta(ev.id); setObsTexto(""); }}
                              className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition">
                              <X className="h-3.5 w-3.5"/> Não realizei
                            </button>
                          </div>
                        )}

                        {/* Form de não realizado */}
                        {obsEsteAberta && (
                          <div className="space-y-2 pt-1">
                            <textarea
                              value={obsTexto}
                              onChange={e => setObsTexto(e.target.value)}
                              placeholder="Pedir remarcação ou deixar um recado para Fátima... (opcional)"
                              rows={2}
                              autoFocus
                              className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => { setObsAberta(null); setObsTexto(""); }}
                                className="flex-1 h-9 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50">
                                Cancelar
                              </button>
                              <button onClick={() => marcarNaoRealizado(ev.id)} disabled={salvando === ev.id}
                                className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-50">
                                {salvando === ev.id ? "Salvando..." : "Confirmar"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Desfazer (realizado ou não realizado) */}
                        {(realizado || naoFeito) && !obsEsteAberta && (
                          <button onClick={() => desfazer(ev.id)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition">
                            Desfazer
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
