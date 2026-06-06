"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";

const HORAS = [
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00",
];

type Agendamento = {
  id: string;
  crianca_id: string;
  at_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  local: string;
  modalidade: string;
  tipo: string;
  observacao: string;
  status: string;
  criancas?: { nome: string };
  atendentes?: { nome: string };
};

type FormData = {
  crianca_id: string; at_id: string; data: string;
  hora_inicio: string; hora_fim: string;
  local: string; modalidade: string; tipo: string; observacao: string;
};

const FORM_VAZIO: FormData = {
  crianca_id: "", at_id: "",
  data: new Date().toISOString().slice(0, 10),
  hora_inicio: "08:00", hora_fim: "09:00",
  local: "clinica", modalidade: "convenio",
  tipo: "sessao", observacao: "",
};

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function getSegunda(base: Date) {
  const d = new Date(base);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AuxAgendaPage() {
  const hoje = useMemo(() => toISO(new Date()), []);
  const [semanaBase, setSemanaBase] = useState<Date>(() => getSegunda(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);

  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaBase);
    d.setDate(semanaBase.getDate() + i);
    return toISO(d);
  }), [semanaBase]);

  const labelSemana = useMemo(() => {
    const ini = new Date(diasSemana[0] + "T12:00:00");
    const fim = new Date(diasSemana[6] + "T12:00:00");
    const mIni = ini.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const mFim = fim.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return mIni === mFim
      ? `${mIni.charAt(0).toUpperCase() + mIni.slice(1)} ${fim.getFullYear()}`
      : `${mIni.charAt(0).toUpperCase() + mIni.slice(1)} – ${mFim.charAt(0).toUpperCase() + mFim.slice(1)} ${fim.getFullYear()}`;
  }, [diasSemana]);

  useEffect(() => {
    async function carregar() {
      const [{ data: cs }, { data: ats }] = await Promise.all([
        supabase.from("criancas").select("id, nome").order("nome"),
        supabase.from("atendentes").select("id, nome").order("nome"),
      ]);
      setCriancas(cs || []);
      setAtendentes(ats || []);
    }
    carregar();
  }, []);

  useEffect(() => { carregarAgendamentos(); }, [diaSelecionado]);

  async function carregarAgendamentos() {
    setLoading(true);
    const { data } = await supabase
      .from("agenda")
      .select("*, criancas(nome), atendentes:at_id(nome)")
      .eq("data", diaSelecionado)
      .order("hora_inicio");
    setAgendamentos((data || []) as Agendamento[]);
    setLoading(false);
  }

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, data: diaSelecionado });
    setEditando(null);
    setModal(true);
  }

  function abrirEdicao(ag: Agendamento) {
    setForm({
      crianca_id: ag.crianca_id, at_id: ag.at_id, data: ag.data,
      hora_inicio: ag.hora_inicio?.slice(0, 5) || "08:00",
      hora_fim: ag.hora_fim?.slice(0, 5) || "09:00",
      local: ag.local, modalidade: ag.modalidade,
      tipo: ag.tipo || "sessao", observacao: ag.observacao || "",
    });
    setEditando(ag);
    setModal(true);
  }

  function fecharModal() { setModal(false); setEditando(null); setForm(FORM_VAZIO); }

  async function salvar() {
    if (!form.crianca_id || !form.at_id || !form.data || !form.hora_inicio || !form.hora_fim) {
      mostrarFeedback("erro", "Preencha todos os campos obrigatórios."); return;
    }
    setSalvando(true);
    const payload = {
      crianca_id: form.crianca_id, at_id: form.at_id,
      data: form.data, hora_inicio: form.hora_inicio, hora_fim: form.hora_fim,
      local: form.local, modalidade: form.modalidade,
      tipo: form.tipo, observacao: form.observacao, status: "agendado",
    };
    const { error } = editando
      ? await supabase.from("agenda").update(payload).eq("id", editando.id)
      : await supabase.from("agenda").insert([payload]);
    if (error) { mostrarFeedback("erro", "Erro: " + error.message); }
    else {
      mostrarFeedback("sucesso", editando ? "Agendamento atualizado!" : "Agendamento criado!");
      fecharModal();
      await carregarAgendamentos();
    }
    setSalvando(false);
  }

  async function cancelarAgendamento(id: string) {
    await supabase.from("agenda").update({ status: "cancelado" }).eq("id", id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "cancelado" } : a));
    mostrarFeedback("sucesso", "Agendamento cancelado.");
  }

  async function deletar(id: string) {
    const { error } = await supabase.from("agenda").delete().eq("id", id);
    if (error) { mostrarFeedback("erro", "Erro: " + error.message); }
    else { setAgendamentos(prev => prev.filter(a => a.id !== id)); mostrarFeedback("sucesso", "Removido."); }
    setConfirmandoDelete(null);
  }

  function corStatus(s: string) {
    if (s === "realizado") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "cancelado") return "bg-red-100 text-red-600 border-red-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  function nomeDia(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  function numDia(d: string) { return new Date(d + "T12:00:00").getDate(); }

  const sel = "w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5 pb-10">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gerencie os agendamentos de atendimento</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="h-4 w-4" /> Agendar
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
          feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>{feedback.msg}
        </div>
      )}

      {/* Calendário */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate()-7); setSemanaBase(d); setDiaSelecionado(toISO(d)); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4 text-slate-600"/>
          </button>
          <span className="text-sm font-semibold text-slate-700">{labelSemana}</span>
          <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate()+7); setSemanaBase(d); setDiaSelecionado(toISO(d)); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4 text-slate-600"/>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {diasSemana.map(dia => (
            <button key={dia} onClick={() => setDiaSelecionado(dia)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl transition ${
                dia === diaSelecionado ? "bg-blue-600 text-white" :
                dia === hoje ? "bg-blue-50 text-blue-700 border border-blue-200" :
                "text-slate-500 hover:bg-slate-50"
              }`}>
              <span className="text-xs font-semibold uppercase">{nomeDia(dia)}</span>
              <span className="text-base font-bold leading-none">{numDia(dia)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 px-1 capitalize">
          {new Date(diaSelecionado + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : agendamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📅</span>
          <p className="text-sm text-slate-400">Nenhum agendamento para este dia.</p>
          <button onClick={abrirNovo} className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition">
            + Agendar atendimento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">{agendamentos.length} agendamento{agendamentos.length !== 1 ? "s" : ""}</p>
          {agendamentos.map(ag => (
            <div key={ag.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-center min-w-[52px]">
                  <p className="text-lg font-bold text-blue-600">{ag.hora_inicio?.slice(0,5)}</p>
                  <p className="text-xs text-slate-400">{ag.hora_fim?.slice(0,5)}</p>
                </div>
                <div className="w-px bg-slate-100 self-stretch"/>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 text-sm truncate">{ag.criancas?.nome || "—"}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${corStatus(ag.status)}`}>
                      {ag.status === "agendado" ? "Agendado" : ag.status === "realizado" ? "Realizado" : "Cancelado"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">👤 {ag.atendentes?.nome || "—"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">📍 {ag.local}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">{ag.modalidade}</span>
                    {ag.tipo && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">{ag.tipo}</span>}
                  </div>
                  {ag.observacao && <p className="text-xs text-slate-400 italic">{ag.observacao}</p>}
                </div>
              </div>

              {ag.status !== "cancelado" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => abrirEdicao(ag)}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                    <Pencil className="h-3 w-3"/> Editar
                  </button>
                  {ag.status === "agendado" && (
                    <button onClick={() => cancelarAgendamento(ag.id)}
                      className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition border border-amber-200">
                      <X className="h-3 w-3"/> Cancelar
                    </button>
                  )}
                  {confirmandoDelete === ag.id ? (
                    <div className="flex gap-1 ml-auto">
                      <button onClick={() => deletar(ag.id)} className="h-8 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg">Confirmar</button>
                      <button onClick={() => setConfirmandoDelete(null)} className="h-8 px-3 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg">Voltar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmandoDelete(ag.id)}
                      className="ml-auto flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition border border-red-200">
                      <Trash2 className="h-3 w-3"/> Excluir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{editando ? "Editar Agendamento" : "Novo Agendamento"}</h2>
                <p className="text-xs text-slate-400">Preencha os dados do atendimento</p>
              </div>
              <button onClick={fecharModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500"/>
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {[
                { label: "Criança *", field: "crianca_id", opts: criancas },
                { label: "Atendente *", field: "at_id", opts: atendentes },
              ].map(({ label, field, opts }) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
                  <select value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} className={sel}>
                    <option value="">Selecione...</option>
                    {opts.map((o: any) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data *</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={sel}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["hora_inicio", "hora_fim"] as const).map((f, i) => (
                  <div key={f} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{i === 0 ? "Início *" : "Fim *"}</label>
                    <select value={form[f]} onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))} className={sel}>
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Local *</label>
                  <select value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} className={sel}>
                    <option value="clinica">Clínica</option>
                    <option value="escola">Escola</option>
                    <option value="casa">Casa</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Modalidade *</label>
                  <select value={form.modalidade} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value }))} className={sel}>
                    <option value="convenio">Convênio</option>
                    <option value="particular">Particular</option>
                    <option value="liminar">Liminar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de sessão</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={sel}>
                  <option value="sessao">Sessão</option>
                  <option value="avaliacao">Avaliação</option>
                  <option value="reuniao">Reunião</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  rows={2} placeholder="Opcional..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"/>
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3 flex-shrink-0">
              <button onClick={fecharModal} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {salvando ? "Salvando..." : <><Check className="h-4 w-4"/>{editando ? "Salvar" : "Criar agendamento"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
