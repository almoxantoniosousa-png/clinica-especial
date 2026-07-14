"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Clock, Calendar, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const HORARIOS = [
  "13:00 – 13:30",
  "13:30 – 14:30",
  "14:30 – 15:30",
  "15:00 – 16:00",
  "15:30 – 16:00",
  "16:00 – 17:00",
  "17:00 – 18:00",
];

const LOCAIS = ["Escola", "Casa", "Clínica"];

type Slot = {
  id: string;
  dia: string;
  horario: string;
  crianca: string;
  servico: string;
  profissional_nome: string | null;
  profissional_id: string | null;
  local: string | null;
};

type Atendente = {
  id: string;
  nome: string;
};

type FormData = {
  dia: string;
  horario: string;
  crianca: string;
  servico: string;
  profissional_id: string;
  profissional_nome: string;
  local: string;
};

const FORM_VAZIO: FormData = {
  dia: DIAS[0],
  horario: HORARIOS[0],
  crianca: "",
  servico: "",
  profissional_id: "",
  profissional_nome: "",
  local: LOCAIS[0],
};

const CORES = [
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-red-100 text-red-800 border-red-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-slate-100 text-slate-800 border-slate-200",
  "bg-amber-100 text-amber-800 border-amber-200",
];

function getCorServico(servico: string, corMap: Record<string, string>) {
  return corMap[servico] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

interface EscalaManagerProps {
  rolesPermitidos: string[];
  titulo: string;
  subtitulo: string;
}

export function EscalaManager({ rolesPermitidos, titulo, subtitulo }: EscalaManagerProps) {
  const supabase = createSupabaseBrowserClient();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [criancas, setCriancas] = useState<string[]>([]);
  const [servicos, setServicos] = useState<string[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaAtivo, setDiaAtivo] = useState(0);
  const [filtroCrianca, setFiltroCrianca] = useState("");
  const [filtroServico, setFiltroServico] = useState("");

  // modal
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  // exclusão
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoLabel, setDeletandoLabel] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const dia = DIAS[diaAtivo];

  const corMap: Record<string, string> = {};
  servicos.forEach((nome, i) => { corMap[nome] = CORES[i % CORES.length]; });

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTudo() {
    setLoading(true);
    const [atendentesRes, criancasRes, servicosRes] = await Promise.all([
      supabase.from("atendentes").select("id, nome").in("role", rolesPermitidos).order("nome"),
      supabase.from("criancas").select("nome").order("nome"),
      supabase.from("tipos_atendimento").select("nome").eq("ativo", true).order("nome"),
    ]);
    const idsPermitidos = new Set((atendentesRes.data ?? []).map((a: Atendente) => a.id));

    const slotsRes = await supabase
      .from("escala")
      .select("id, dia, horario, crianca, servico, profissional_nome, profissional_id, local")
      .order("horario");

    const slotsFiltrados = (slotsRes.data ?? []).filter(
      (s: Slot) => !s.profissional_id || idsPermitidos.has(s.profissional_id)
    );

    setSlots(slotsFiltrados);
    setCriancas((criancasRes.data ?? []).map((c: { nome: string }) => c.nome));
    setServicos((servicosRes.data ?? []).map((s: { nome: string }) => s.nome));
    setAtendentes(atendentesRes.data ?? []);
    setLoading(false);
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...FORM_VAZIO, dia });
    setErroForm("");
    setModalAberto(true);
  }

  function abrirEditar(slot: Slot) {
    setEditandoId(slot.id);
    setForm({
      dia: slot.dia,
      horario: slot.horario,
      crianca: slot.crianca,
      servico: slot.servico,
      profissional_id: slot.profissional_id ?? "",
      profissional_nome: slot.profissional_nome ?? "",
      local: slot.local ?? LOCAIS[0],
    });
    setErroForm("");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setErroForm("");
  }

  function handleProfissional(id: string) {
    const at = atendentes.find((a) => a.id === id);
    setForm((f) => ({ ...f, profissional_id: id, profissional_nome: at?.nome ?? "" }));
  }

  async function salvar() {
    if (!form.crianca || !form.servico) {
      setErroForm("Criança e serviço são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErroForm("");

    const payload = {
      dia: form.dia,
      horario: form.horario,
      crianca: form.crianca,
      servico: form.servico,
      profissional_id: form.profissional_id || null,
      profissional_nome: form.profissional_nome || null,
      local: form.local || null,
    };

    const { error } = editandoId
      ? await supabase.from("escala").update(payload).eq("id", editandoId)
      : await supabase.from("escala").insert(payload);

    setSalvando(false);

    if (error) {
      setErroForm(error.message);
      return;
    }

    fecharModal();
    carregarTudo();
  }

  async function excluir() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("escala").delete().eq("id", deletandoId);
    setSlots((prev) => prev.filter((s) => s.id !== deletandoId));
    setDeletandoId(null);
    setDeletandoLabel("");
    setExcluindo(false);
  }

  const slotsDoDia = slots.filter((s) => {
    if (s.dia !== dia) return false;
    if (filtroCrianca && s.crianca !== filtroCrianca) return false;
    if (filtroServico && s.servico !== filtroServico) return false;
    return true;
  });

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            {titulo}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{subtitulo}</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo atendimento
        </button>
      </div>

      {/* NAVEGAÇÃO DE DIAS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDiaAtivo((p) => Math.max(0, p - 1))}
          disabled={diaAtivo === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {DIAS.map((d, i) => (
            <button
              key={d}
              onClick={() => setDiaAtivo(i)}
              className={`flex-1 min-w-[80px] py-2 rounded-xl text-sm font-semibold transition-all ${
                diaAtivo === i
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-blue-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={() => setDiaAtivo((p) => Math.min(4, p + 1))}
          disabled={diaAtivo === 4}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filtroCrianca}
          onChange={(e) => setFiltroCrianca(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as crianças</option>
          {criancas.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filtroServico}
          onChange={(e) => setFiltroServico(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os serviços</option>
          {servicos.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filtroCrianca || filtroServico) && (
          <button
            onClick={() => { setFiltroCrianca(""); setFiltroServico(""); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg hover:border-red-200"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* HORÁRIOS */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
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
                  <span className="ml-auto text-xs text-slate-400">
                    {slotsHorario.length} atendimento{slotsHorario.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-3">
                  {slotsHorario.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">Nenhum atendimento neste horário</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slotsHorario.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex flex-col px-3 py-2 rounded-lg border text-xs font-medium ${getCorServico(slot.servico, corMap)}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{slot.crianca}</span>
                            <span className="opacity-60">·</span>
                            <span>{slot.servico}</span>
                            <div className="flex items-center gap-1 ml-auto pl-2">
                              <button
                                onClick={() => abrirEditar(slot)}
                                className="p-0.5 rounded hover:bg-black/10 transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => { setDeletandoId(slot.id); setDeletandoLabel(`${slot.crianca} · ${slot.servico}`); }}
                                className="p-0.5 rounded hover:bg-red-200 text-red-600 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {slot.profissional_nome && (
                            <span className="text-xs opacity-70 mt-0.5">
                              👤 {slot.profissional_nome}
                            </span>
                          )}
                          {slot.local && (
                            <span className="text-xs opacity-70">
                              📍 {slot.local}
                            </span>
                          )}
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

      {/* LEGENDA */}
      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Legenda</p>
        <div className="flex flex-wrap gap-2">
          {servicos.map((nome, i) => (
            <span key={nome} className={`px-2 py-1 rounded-md border text-xs font-medium ${CORES[i % CORES.length]}`}>
              {nome}
            </span>
          ))}
        </div>
      </div>

      {/* MODAL CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover atendimento?</h3>
                <p className="text-sm text-slate-500 mt-1">{deletandoLabel}</p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletandoId(null); setDeletandoLabel(""); }}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={excluir}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {excluindo ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO / EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">

            {/* cabeçalho */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editandoId ? "Editar atendimento" : "Novo atendimento"}
              </h2>
              <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* campos */}
            <div className="space-y-4">

              {/* dia */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Dia</label>
                <select
                  value={form.dia}
                  onChange={(e) => setForm((f) => ({ ...f, dia: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* horário */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Horário</label>
                <select
                  value={form.horario}
                  onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {HORARIOS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* criança */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Criança</label>
                <select
                  value={form.crianca}
                  onChange={(e) => setForm((f) => ({ ...f, crianca: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {criancas.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* serviço */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Serviço</label>
                <select
                  value={form.servico}
                  onChange={(e) => setForm((f) => ({ ...f, servico: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {servicos.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* local */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Local do atendimento</label>
                <select
                  value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LOCAIS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* profissional responsável */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Profissional responsável</label>
                <select
                  value={form.profissional_id}
                  onChange={(e) => handleProfissional(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum</option>
                  {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            </div>

            {/* erro */}
            {erroForm && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>
            )}

            {/* ações */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={fecharModal}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors"
              >
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
