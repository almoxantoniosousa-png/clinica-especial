"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Clock, Calendar, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check, Settings } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

type Slot = { id: string; dia: string; horario: string; crianca: string; servico: string };
type TipoAtendimento = { id: string; nome: string; cor: string; ativo: boolean };
type Horario = { id: string; horario: string; ordem: number; ativo: boolean };
type Crianca = { id: string; nome: string };
type Atendente = { id: string; nome: string; role: string };

function getCorServico(servico: string, tipos: TipoAtendimento[]) {
  const tipo = tipos.find(t => t.nome === servico);
  if (tipo) return tipo.cor;
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default function EscalaPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [tipos, setTipos] = useState<TipoAtendimento[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaAtivo, setDiaAtivo] = useState(0);
  const [filtroCrianca, setFiltroCrianca] = useState("");
  const [filtroServico, setFiltroServico] = useState("");

  // Modal slot
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Slot | null>(null);
  const [form, setForm] = useState({ dia: DIAS[0], horario: "", crianca: "", servico: "" });
  const [salvando, setSalvando] = useState(false);

  // Modal configurações
  const [modalConfig, setModalConfig] = useState(false);
  const [abaConfig, setAbaConfig] = useState<"tipos" | "horarios">("tipos");
  const [novoTipo, setNovoTipo] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dia = DIAS[diaAtivo];

  function mostrarFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    setLoading(true);
    const [
      { data: slotsData },
      { data: criancasData },
      { data: atendentesData },
      { data: tiposData },
      { data: horariosData },
    ] = await Promise.all([
      supabase.from("escala").select("*").order("horario"),
      supabase.from("criancas").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("atendentes").select("id, nome, role").eq("ativo", true).order("nome"),
      supabase.from("tipos_atendimento").select("*").eq("ativo", true).order("nome"),
      supabase.from("horarios_escala").select("*").eq("ativo", true).order("ordem"),
    ]);
    setSlots(slotsData || []);
    setCriancas(criancasData || []);
    setAtendentes(atendentesData || []);
    setTipos(tiposData || []);
    setHorarios(horariosData || []);
    setLoading(false);
  }

  function abrirAdicionar(horario?: string) {
    setEditando(null);
    setForm({
      dia,
      horario: horario || horarios[0]?.horario || "",
      crianca: criancas[0]?.nome || "",
      servico: tipos[0]?.nome || "",
    });
    setModalAberto(true);
  }

  function abrirEditar(slot: Slot) {
    setEditando(slot);
    setForm({ dia: slot.dia, horario: slot.horario, crianca: slot.crianca, servico: slot.servico });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.crianca || !form.servico || !form.horario) return;
    setSalvando(true);
    if (editando) {
      const { error } = await supabase.from("escala").update(form).eq("id", editando.id);
      if (!error) setSlots(prev => prev.map(s => s.id === editando.id ? { ...s, ...form } : s));
    } else {
      const { data, error } = await supabase.from("escala").insert(form).select().single();
      if (!error && data) setSlots(prev => [...prev, data]);
    }
    setSalvando(false);
    setModalAberto(false);
  }

  async function deletar(id: string) {
    const { error } = await supabase.from("escala").delete().eq("id", id);
    if (!error) setSlots(prev => prev.filter(s => s.id !== id));
    setDeletandoId(null);
  }

  // Config — Tipos
  async function adicionarTipo() {
    if (!novoTipo.trim()) return;
    setSalvandoConfig(true);
    const { data, error } = await supabase.from("tipos_atendimento").insert({ nome: novoTipo.trim() }).select().single();
    if (!error && data) { setTipos(prev => [...prev, data]); setNovoTipo(""); mostrarFeedback("Tipo adicionado!"); }
    setSalvandoConfig(false);
  }

  async function removerTipo(id: string) {
    await supabase.from("tipos_atendimento").update({ ativo: false }).eq("id", id);
    setTipos(prev => prev.filter(t => t.id !== id));
    mostrarFeedback("Tipo removido!");
  }

  // Config — Horários
  async function adicionarHorario() {
    if (!novoHorario.trim()) return;
    setSalvandoConfig(true);
    const ordem = horarios.length + 1;
    const { data, error } = await supabase.from("horarios_escala").insert({ horario: novoHorario.trim(), ordem }).select().single();
    if (!error && data) { setHorarios(prev => [...prev, data]); setNovoHorario(""); mostrarFeedback("Horário adicionado!"); }
    setSalvandoConfig(false);
  }

  async function removerHorario(id: string) {
    await supabase.from("horarios_escala").update({ ativo: false }).eq("id", id);
    setHorarios(prev => prev.filter(h => h.id !== id));
    mostrarFeedback("Horário removido!");
  }

  const slotsDoDia = slots.filter(s => {
    if (s.dia !== dia) return false;
    if (filtroCrianca && s.crianca !== filtroCrianca) return false;
    if (filtroServico && s.servico !== filtroServico) return false;
    return true;
  });

  const todasCriancas = Array.from(new Set(slots.filter(s => s.dia === dia).map(s => s.crianca))).sort();
  const todosServicos = Array.from(new Set(slots.filter(s => s.dia === dia).map(s => s.servico))).sort();

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Frequência Semanal 2026
          </h1>
          <p className="text-sm text-slate-400 mt-1">Escala de atendimentos — Segunda a Sexta</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalConfig(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">
            <Settings className="h-4 w-4" />
            Configurar
          </button>
          <button onClick={() => abrirAdicionar()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />
            Novo atendimento
          </button>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          ✓ {feedback}
        </div>
      )}

      {/* NAVEGAÇÃO DIAS */}
      <div className="flex items-center gap-2">
        <button onClick={() => setDiaAtivo(p => Math.max(0, p - 1))} disabled={diaAtivo === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {DIAS.map((d, i) => (
            <button key={d} onClick={() => setDiaAtivo(i)}
              className={`flex-1 min-w-[80px] py-2 rounded-xl text-sm font-semibold transition-all
                ${diaAtivo === i ? "bg-blue-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-blue-50"}`}>
              {d}
            </button>
          ))}
        </div>
        <button onClick={() => setDiaAtivo(p => Math.min(4, p + 1))} disabled={diaAtivo === 4}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 flex-wrap">
        <select value={filtroCrianca} onChange={e => setFiltroCrianca(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as crianças</option>
          {todasCriancas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os serviços</option>
          {todosServicos.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filtroCrianca || filtroServico) && (
          <button onClick={() => { setFiltroCrianca(""); setFiltroServico(""); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg hover:border-red-200">
            Limpar filtros
          </button>
        )}
      </div>

      {/* HORÁRIOS */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando escala...</div>
      ) : (
        <div className="space-y-3">
          {horarios.map(h => {
            const slotsHorario = slotsDoDia.filter(s => s.horario === h.horario);
            if (slotsHorario.length === 0 && (filtroCrianca || filtroServico)) return null;
            return (
              <div key={h.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center gap-2 border-b border-slate-200">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">{h.horario}</span>
                  <span className="ml-auto text-xs text-slate-400">{slotsHorario.length} atendimento{slotsHorario.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => abrirAdicionar(h.horario)}
                    className="ml-2 text-blue-400 hover:text-blue-600 transition">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3">
                  {slotsHorario.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">Nenhum atendimento</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slotsHorario.map(slot => (
                        <div key={slot.id}
                          className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${getCorServico(slot.servico, tipos)}`}>
                          <span className="font-bold">{slot.crianca}</span>
                          <span className="opacity-60">·</span>
                          <span>{slot.servico}</span>
                          <div className="hidden group-hover:flex items-center gap-1 ml-1">
                            <button onClick={() => abrirEditar(slot)} className="hover:opacity-70 transition">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => setDeletandoId(slot.id)} className="hover:opacity-70 transition">
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

      {/* LEGENDA DINÂMICA */}
      {tipos.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Legenda</p>
          <div className="flex flex-wrap gap-2">
            {tipos.map(t => (
              <span key={t.id} className={`px-2 py-1 rounded-md border text-xs font-medium ${t.cor}`}>{t.nome}</span>
            ))}
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR/EDITAR SLOT */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
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
                <select value={form.dia} onChange={e => setForm({ ...form, dia: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horário</label>
                <select value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {horarios.map(h => <option key={h.id} value={h.horario}>{h.horario}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Criança</label>
                <select value={form.crianca} onChange={e => setForm({ ...form, crianca: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Atendimento</label>
                <select value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {tipos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !form.crianca || !form.servico || !form.horario}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÕES */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setModalConfig(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5" /> Configurações da Escala
              </h2>
              <button onClick={() => setModalConfig(false)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Abas config */}
            <div className="flex border-b border-slate-200">
              {[
                { id: "tipos", label: "Tipos de Atendimento" },
                { id: "horarios", label: "Horários" },
              ].map(a => (
                <button key={a.id} onClick={() => setAbaConfig(a.id as any)}
                  className={`flex-1 py-3 text-sm font-semibold transition
                    ${abaConfig === a.id ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                  {a.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {abaConfig === "tipos" && (
                <>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ex: Fonoaudiologia" value={novoTipo}
                      onChange={e => setNovoTipo(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && adicionarTipo()}
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <button onClick={adicionarTipo} disabled={salvandoConfig || !novoTipo.trim()}
                      className="px-4 h-10 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                      Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tipos.map(t => (
                      <div key={t.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${t.cor}`}>
                        <span className="text-sm font-medium">{t.nome}</span>
                        <button onClick={() => removerTipo(t.id)} className="hover:opacity-70 transition">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {abaConfig === "horarios" && (
                <>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ex: 08:00 – 09:00" value={novoHorario}
                      onChange={e => setNovoHorario(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && adicionarHorario()}
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <button onClick={adicionarHorario} disabled={salvandoConfig || !novoHorario.trim()}
                      className="px-4 h-10 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                      Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {horarios.map(h => (
                      <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-slate-700">{h.horario}</span>
                        </div>
                        <button onClick={() => removerHorario(h.id)} className="text-slate-400 hover:text-red-600 transition">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
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