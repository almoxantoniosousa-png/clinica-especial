"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Clock, Calendar, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const HORARIOS = [
  "13:00 – 13:30",
  "13:30 – 14:30",
  "14:30 – 15:30",
  "15:00 – 16:00",
  "15:30 – 16:00",
  "16:00 – 17:00",
  "17:00 – 18:00",
];
const SERVICOS = ["AVD","Reforço","TO","Simone","Juliana","João","Bia Moura","Geovana","Franciele","Elaine","Muralha","AVD/Reforço"];
const CRIANCAS = ["Álvaro","Bella","Carol","Eduardo","Enzo","Gabriel","Lonan","Mel","Tiago"];

type Slot = { id: string; dia: string; horario: string; crianca: string; servico: string };

function getCorServico(servico: string) {
  const s = servico.toLowerCase();
  if (s.includes("avd"))      return "bg-orange-100 text-orange-800 border-orange-200";
  if (s.includes("reforço") || s.includes("reforco")) return "bg-purple-100 text-purple-800 border-purple-200";
  if (s.includes("to"))       return "bg-teal-100 text-teal-800 border-teal-200";
  if (s === "simone")         return "bg-pink-100 text-pink-800 border-pink-200";
  if (s === "juliana")        return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "joão" || s === "joao") return "bg-green-100 text-green-800 border-green-200";
  if (s === "bia moura")      return "bg-red-100 text-red-800 border-red-200";
  if (s === "geovana")        return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s === "franciele")      return "bg-indigo-100 text-indigo-800 border-indigo-200";
  if (s === "elaine")         return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (s === "muralha")        return "bg-slate-100 text-slate-800 border-slate-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default function EscalaPage() {
  const supabase = createSupabaseBrowserClient();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaAtivo, setDiaAtivo] = useState(0);
  const [filtroCrianca, setFiltroCrianca] = useState("");
  const [filtroServico, setFiltroServico] = useState("");

  // Modal adicionar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Slot | null>(null);
  const [form, setForm] = useState({ dia: DIAS[0], horario: HORARIOS[0], crianca: CRIANCAS[0], servico: SERVICOS[0] });
  const [salvando, setSalvando] = useState(false);

  // Confirmar exclusão
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const dia = DIAS[diaAtivo];

  useEffect(() => {
    carregarSlots();
  }, []);

  async function carregarSlots() {
    setLoading(true);
    const { data, error } = await supabase.from("escala").select("*").order("horario");
    if (error) console.error(error);
    if (data) setSlots(data);
    setLoading(false);
  }

  function abrirAdicionar(horario?: string) {
    setEditando(null);
    setForm({ dia, horario: horario || HORARIOS[0], crianca: CRIANCAS[0], servico: SERVICOS[0] });
    setModalAberto(true);
  }

  function abrirEditar(slot: Slot) {
    setEditando(slot);
    setForm({ dia: slot.dia, horario: slot.horario, crianca: slot.crianca, servico: slot.servico });
    setModalAberto(true);
  }

  async function salvar() {
    setSalvando(true);
    if (editando) {
      const { error } = await supabase.from("escala").update(form).eq("id", editando.id);
      if (!error) setSlots((prev) => prev.map((s) => s.id === editando.id ? { ...s, ...form } : s));
    } else {
      const { data, error } = await supabase.from("escala").insert(form).select().single();
      if (!error && data) setSlots((prev) => [...prev, data]);
    }
    setSalvando(false);
    setModalAberto(false);
  }

  async function deletar(id: string) {
    const { error } = await supabase.from("escala").delete().eq("id", id);
    if (!error) setSlots((prev) => prev.filter((s) => s.id !== id));
    setDeletandoId(null);
  }

  const slotsDoDia = slots.filter((s) => {
    if (s.dia !== dia) return false;
    if (filtroCrianca && s.crianca !== filtroCrianca) return false;
    if (filtroServico && s.servico !== filtroServico) return false;
    return true;
  });

  const todasCriancas = Array.from(new Set(slots.filter(s => s.dia === dia).map(s => s.crianca))).sort();
  const todosServicos = Array.from(new Set(slots.filter(s => s.dia === dia).map(s => s.servico))).sort();

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Frequência Semanal 2026
          </h1>
          <p className="text-sm text-slate-400 mt-1">Escala de atendimentos — Segunda a Sexta</p>
        </div>
        <button
          onClick={() => abrirAdicionar()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Novo atendimento
        </button>
      </div>

      {/* Navegação de dias */}
      <div className="flex items-center gap-2">
        <button onClick={() => setDiaAtivo((p) => Math.max(0, p - 1))} disabled={diaAtivo === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {DIAS.map((d, i) => (
            <button key={d} onClick={() => setDiaAtivo(i)}
              className={`flex-1 min-w-[80px] py-2 rounded-xl text-sm font-semibold transition-all ${
                diaAtivo === i ? "bg-blue-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-blue-50"
              }`}>
              {d}
            </button>
          ))}
        </div>
        <button onClick={() => setDiaAtivo((p) => Math.min(4, p + 1))} disabled={diaAtivo === 4}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select value={filtroCrianca} onChange={(e) => setFiltroCrianca(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as crianças</option>
          {todasCriancas.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroServico} onChange={(e) => setFiltroServico(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os serviços</option>
          {todosServicos.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filtroCrianca || filtroServico) && (
          <button onClick={() => { setFiltroCrianca(""); setFiltroServico(""); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg hover:border-red-200">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Horários */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando escala...</div>
      ) : (
        <div className="space-y-3">
          {HORARIOS.map((horario) => {
            const slotsHorario = slotsDoDia.filter((s) => s.horario === horario);
            if (slotsHorario.length === 0 && (filtroCrianca || filtroServico)) return null;
            return (
              <div key={horario} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center gap-2 border-b border-slate-200">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">{horario}</span>
                  <span className="ml-auto text-xs text-slate-400">{slotsHorario.length} atendimento{slotsHorario.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => abrirAdicionar(horario)}
                    className="ml-2 text-blue-400 hover:text-blue-600 transition" title="Adicionar neste horário">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3">
                  {slotsHorario.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">Nenhum atendimento</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slotsHorario.map((slot) => (
                        <div key={slot.id}
                          className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${getCorServico(slot.servico)}`}>
                          <span className="font-bold">{slot.crianca}</span>
                          <span className="opacity-60">·</span>
                          <span>{slot.servico}</span>
                          {/* Ações */}
                          <div className="hidden group-hover:flex items-center gap-1 ml-1">
                            <button onClick={() => abrirEditar(slot)}
                              className="hover:opacity-70 transition" title="Editar">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => setDeletandoId(slot.id)}
                              className="hover:opacity-70 transition" title="Excluir">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Legenda</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "AVD", cor: "bg-orange-100 text-orange-800 border-orange-200" },
            { label: "Reforço", cor: "bg-purple-100 text-purple-800 border-purple-200" },
            { label: "TO", cor: "bg-teal-100 text-teal-800 border-teal-200" },
            { label: "Simone", cor: "bg-pink-100 text-pink-800 border-pink-200" },
            { label: "Juliana", cor: "bg-blue-100 text-blue-800 border-blue-200" },
            { label: "João", cor: "bg-green-100 text-green-800 border-green-200" },
            { label: "Bia Moura", cor: "bg-red-100 text-red-800 border-red-200" },
            { label: "Geovana", cor: "bg-yellow-100 text-yellow-800 border-yellow-200" },
            { label: "Franciele", cor: "bg-indigo-100 text-indigo-800 border-indigo-200" },
            { label: "Elaine", cor: "bg-cyan-100 text-cyan-800 border-cyan-200" },
            { label: "Muralha", cor: "bg-slate-100 text-slate-800 border-slate-200" },
          ].map((item) => (
            <span key={item.label} className={`px-2 py-1 rounded-md border text-xs font-medium ${item.cor}`}>{item.label}</span>
          ))}
        </div>
      </div>

      {/* MODAL ADICIONAR/EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{editando ? "Editar atendimento" : "Novo atendimento"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dia</label>
                <select value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horário</label>
                <select value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {HORARIOS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Criança</label>
                <select value={form.crianca} onChange={(e) => setForm({ ...form, crianca: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CRIANCAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Serviço / Profissional</label>
                <select value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SERVICOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Excluir atendimento?</h3>
                <p className="text-sm text-slate-500 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={() => deletar(deletandoId)}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}