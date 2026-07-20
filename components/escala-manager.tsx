"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Clock, Calendar, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, History, Printer } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

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

type Presenca = "P" | "F" | "FJ";
const PRESENCAS: { valor: Presenca; label: string; cor: string }[] = [
  { valor: "P",  label: "Presença",         cor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { valor: "F",  label: "Falta",            cor: "bg-red-100 text-red-700 border-red-200" },
  { valor: "FJ", label: "Falta justificada", cor: "bg-amber-100 text-amber-700 border-amber-200" },
];

type Slot = {
  id: string;
  dia: string;
  horario: string;
  crianca: string;
  servico: string;
  profissional_nome: string | null;
  profissional_id: string | null;
  local: string | null;
  presenca: Presenca | null;
  motivo: string | null;
  atualizado_por_nome: string | null;
  atualizado_em: string | null;
};

type HistoricoItem = {
  id: string;
  acao: "edicao" | "exclusao";
  dia: string | null;
  horario: string | null;
  crianca: string | null;
  servico: string | null;
  profissional_nome: string | null;
  local: string | null;
  presenca: Presenca | null;
  motivo: string | null;
  editado_por_nome: string | null;
  editado_por_email: string;
  editado_em: string;
};

type Atendente = {
  id: string;
  nome: string;
  role: string;
};

const LABEL_ROLE: Record<string, string> = {
  especialista: "Especialistas",
  atendente: "Acompanhantes Terapêuticos (AT)",
  at: "Acompanhantes Terapêuticos (AT)",
};

type FormData = {
  dia: string;
  horario: string;
  crianca: string;
  servico: string;
  profissional_id: string;
  profissional_nome: string;
  local: string;
  motivo: string;
};

const FORM_VAZIO: FormData = {
  dia: DIAS[0],
  horario: HORARIOS[0],
  crianca: "",
  servico: "",
  profissional_id: "",
  profissional_nome: "",
  local: LOCAIS[0],
  motivo: "",
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
  const [visualizacao, setVisualizacao] = useState<"dia" | "semana" | "anterior">("dia");
  const [filtroCrianca, setFiltroCrianca] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [podeEditar, setPodeEditar] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");
  const [servicoLivre, setServicoLivre] = useState(false);
  const [profissionalLivre, setProfissionalLivre] = useState(false);

  // histórico
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [historicoDe, setHistoricoDe] = useState("");
  const [historicoAte, setHistoricoAte] = useState("");
  const [historicoBusca, setHistoricoBusca] = useState("");
  const [consultandoData, setConsultandoData] = useState(false);
  const [consultaErro, setConsultaErro] = useState("");
  const [consultaResultado, setConsultaResultado] = useState<{
    criado_em: string; criado_por_nome: string | null; dados: Slot[];
  } | null>(null);
  const [snapshotsLista, setSnapshotsLista] = useState<{ id: string; criado_em: string; criado_por_nome: string | null }[]>([]);
  const [snapshotIndex, setSnapshotIndex] = useState(-1);
  const [dataBusca, setDataBusca] = useState("");
  const [dataBuscada, setDataBuscada] = useState("");

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
  const [erroExclusao, setErroExclusao] = useState("");

  const dia = DIAS[diaAtivo];

  const corMap: Record<string, string> = {};
  servicos.forEach((nome, i) => { corMap[nome] = CORES[i % CORES.length]; });

  const roleDoProfissional: Record<string, string> = {};
  atendentes.forEach((a) => { roleDoProfissional[a.id] = (a.role || "").toString().trim().toLowerCase(); });
  const rolesParaImprimir = Array.from(new Set(rolesPermitidos.map((r) => r.toLowerCase())));

  useEffect(() => {
    carregarTudo();
    verificarPermissao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verificarPermissao() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    setUsuarioEmail(user.email);
    const { data: u } = await supabase.from("usuarios").select("role, nome").eq("email", user.email).maybeSingle();
    const role = (u?.role || "").toString().trim().toLowerCase();
    if (role) {
      setUsuarioNome(u?.nome || "");
      setPodeEditar(role === "supervisora" || role === "adm" || role === "admin");
      return;
    }
    const { data: a } = await supabase.from("atendentes").select("role, nome").eq("email", user.email).maybeSingle();
    setUsuarioNome(a?.nome || "");
    setPodeEditar((a?.role || "").toString().trim().toLowerCase() === "supervisora");
  }

  async function carregarTudo() {
    setLoading(true);
    const [atendentesRes, criancasRes, servicosRes] = await Promise.all([
      supabase.from("atendentes").select("id, nome, role").in("role", rolesPermitidos).order("nome"),
      supabase.from("criancas").select("nome").order("nome"),
      supabase.from("tipos_atendimento").select("nome").eq("ativo", true).order("nome"),
    ]);
    const idsPermitidos = new Set((atendentesRes.data ?? []).map((a: Atendente) => a.id));

    const slotsRes = await supabase
      .from("escala")
      .select("id, dia, horario, crianca, servico, profissional_nome, profissional_id, local, presenca, motivo, atualizado_por_nome, atualizado_em")
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
    setServicoLivre(false);
    setProfissionalLivre(false);
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
      motivo: slot.motivo ?? "",
    });
    // Se o valor salvo não está nas listas conhecidas, foi digitado na mão —
    // abre o campo já em modo texto pra edição não "sumir" com o dado.
    setServicoLivre(!!slot.servico && !servicos.includes(slot.servico));
    setProfissionalLivre(!slot.profissional_id && !!slot.profissional_nome);
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

  async function arquivar(slot: Slot, acao: "edicao" | "exclusao") {
    await supabase.from("escala_historico").insert({
      escala_id: slot.id,
      acao,
      dia: slot.dia,
      horario: slot.horario,
      crianca: slot.crianca,
      servico: slot.servico,
      profissional_id: slot.profissional_id,
      profissional_nome: slot.profissional_nome,
      local: slot.local,
      presenca: slot.presenca,
      motivo: slot.motivo,
      editado_por_email: usuarioEmail,
      editado_por_nome: usuarioNome || null,
    });
  }

  // Foto completa da escala inteira (não só o que mudou) — pra dar pra
  // buscar "como estava a escala" numa data, pra fins comprobatórios.
  async function tirarSnapshot() {
    const { data } = await supabase.from("escala").select("*");
    await supabase.from("escala_snapshots").insert({
      criado_por_email: usuarioEmail,
      criado_por_nome: usuarioNome || null,
      dados: data || [],
    });
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
      motivo: form.motivo.trim() || null,
    };

    let error;
    if (editandoId) {
      const anterior = slots.find((s) => s.id === editandoId);
      if (anterior) await arquivar(anterior, "edicao");
      ({ error } = await supabase.from("escala").update({
        ...payload,
        atualizado_por_email: usuarioEmail,
        atualizado_por_nome: usuarioNome || null,
        atualizado_em: new Date().toISOString(),
      }).eq("id", editandoId));
      if (!error) {
        await registrarLog(supabase, {
          usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Editou atendimento da escala",
          tabela: "escala", registro_id: editandoId,
          descricao: `${payload.crianca} · ${payload.servico} (${payload.dia}, ${payload.horario})`,
        });
      }
    } else {
      ({ error } = await supabase.from("escala").insert({
        ...payload,
        criado_por_email: usuarioEmail,
        criado_por_nome: usuarioNome || null,
      }));
      if (!error) {
        await registrarLog(supabase, {
          usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Cadastrou atendimento na escala",
          tabela: "escala",
          descricao: `${payload.crianca} · ${payload.servico} (${payload.dia}, ${payload.horario})`,
        });
      }
    }

    setSalvando(false);

    if (error) {
      setErroForm(error.message);
      return;
    }

    await tirarSnapshot();
    fecharModal();
    carregarTudo();
  }

  async function marcarPresenca(slot: Slot, presenca: Presenca) {
    const novo = slot.presenca === presenca ? null : presenca;
    await arquivar(slot, "edicao");
    setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, presenca: novo } : s));
    const { error } = await supabase.from("escala").update({
      presenca: novo,
      atualizado_por_email: usuarioEmail,
      atualizado_por_nome: usuarioNome || null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", slot.id);
    if (error) {
      setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, presenca: slot.presenca } : s));
      return;
    }
    await registrarLog(supabase, {
      usuario_email: usuarioEmail, usuario_nome: usuarioNome,
      acao: novo ? `Marcou presença (${novo})` : "Removeu marcação de presença",
      tabela: "escala", registro_id: slot.id,
      descricao: `${slot.crianca} · ${slot.servico} (${slot.dia}, ${slot.horario})`,
    });
    await tirarSnapshot();
  }

  async function excluir() {
    if (!deletandoId) return;
    setExcluindo(true);
    setErroExclusao("");
    const slot = slots.find((s) => s.id === deletandoId);
    if (slot) await arquivar(slot, "exclusao");
    const { error } = await supabase.from("escala").delete().eq("id", deletandoId);
    setExcluindo(false);
    if (error) {
      setErroExclusao("Não foi possível remover. Tente novamente.");
      return;
    }
    if (slot) {
      await registrarLog(supabase, {
        usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Excluiu atendimento da escala",
        tabela: "escala", registro_id: deletandoId,
        descricao: `${slot.crianca} · ${slot.servico} (${slot.dia}, ${slot.horario})`,
      });
    }
    await tirarSnapshot();
    setSlots((prev) => prev.filter((s) => s.id !== deletandoId));
    setDeletandoId(null);
    setDeletandoLabel("");
  }

  async function carregarHistorico(overrides?: { de?: string; ate?: string; busca?: string }) {
    const de = overrides?.de ?? historicoDe;
    const ate = overrides?.ate ?? historicoAte;
    const busca = (overrides?.busca ?? historicoBusca).trim().toLowerCase();

    setCarregandoHistorico(true);
    let query = supabase
      .from("escala_historico")
      .select("*")
      .order("editado_em", { ascending: false })
      .limit(300);
    if (de) query = query.gte("editado_em", `${de}T00:00:00`);
    if (ate) query = query.lte("editado_em", `${ate}T23:59:59`);
    const { data } = await query;
    let itens = (data ?? []) as HistoricoItem[];
    if (busca) {
      itens = itens.filter((h) =>
        (h.crianca || "").toLowerCase().includes(busca) ||
        (h.profissional_nome || "").toLowerCase().includes(busca)
      );
    }
    setHistorico(itens);
    setCarregandoHistorico(false);
  }

  // Lista leve de todas as fotos da escala (sem o jsonb pesado), do mais antigo pro mais novo,
  // pra navegar com "semana anterior" / "próxima semana" — fins comprobatórios.
  async function carregarListaSnapshots() {
    setConsultandoData(true);
    setConsultaErro("");
    const { data } = await supabase
      .from("escala_snapshots")
      .select("id, criado_em, criado_por_nome")
      .order("criado_em", { ascending: true });
    const lista = data ?? [];
    setSnapshotsLista(lista);
    if (lista.length === 0) {
      setConsultandoData(false);
      setConsultaErro("Nenhum registro de escala encontrado ainda.");
      return;
    }
    await abrirSnapshot(lista.length - 1, lista);
  }

  async function abrirSnapshot(index: number, lista?: { id: string; criado_em: string; criado_por_nome: string | null }[]) {
    const fonte = lista ?? snapshotsLista;
    const alvo = fonte[index];
    if (!alvo) return;
    setConsultandoData(true);
    setConsultaErro("");
    const { data } = await supabase.from("escala_snapshots").select("dados").eq("id", alvo.id).maybeSingle();
    setConsultandoData(false);
    setSnapshotIndex(index);
    setConsultaResultado({
      criado_em: alvo.criado_em,
      criado_por_nome: alvo.criado_por_nome,
      dados: (data?.dados ?? []) as Slot[],
    });
  }

  // Pula direto pra foto mais próxima de uma data escolhida no calendário (ex: "2026-04-15")
  async function irParaData(data: string) {
    if (!data || snapshotsLista.length === 0) return;
    const fimDoDia = new Date(`${data}T23:59:59`).getTime();

    let indexAlvo = -1;
    for (let i = snapshotsLista.length - 1; i >= 0; i--) {
      const t = new Date(snapshotsLista[i].criado_em).getTime();
      if (t <= fimDoDia) { indexAlvo = i; break; }
    }
    if (indexAlvo === -1) indexAlvo = 0;
    setDataBuscada(data);
    await abrirSnapshot(indexAlvo);
  }

  const slotsDoDia = slots.filter((s) => {
    if (s.dia !== dia) return false;
    if (filtroCrianca && s.crianca !== filtroCrianca) return false;
    if (filtroServico && s.servico !== filtroServico) return false;
    return true;
  });

  return (
    <div className="space-y-6">
    <div className="print:hidden space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            {titulo}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{subtitulo}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setHistoricoAberto(true); carregarHistorico(); }}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <History className="h-4 w-4" />
            Histórico
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            title="Imprimir a escala semanal pra colocar no mural"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          {podeEditar && (
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo atendimento
            </button>
          )}
        </div>
      </div>

      {/* ALTERNAR DIA / SEMANA / ANTERIOR */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([{ v: "dia", label: "Por dia" }, { v: "semana", label: "Semana inteira" }, { v: "anterior", label: "Escala anterior" }] as const).map((o) => (
          <button key={o.v} onClick={() => { setVisualizacao(o.v); if (o.v === "anterior" && snapshotsLista.length === 0) carregarListaSnapshots(); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${visualizacao === o.v ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* NAVEGAÇÃO DE DIAS */}
      {visualizacao === "dia" && (
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
      )}

      {/* FILTROS */}
      {visualizacao !== "anterior" && (
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
      )}

      {/* HORÁRIOS */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : visualizacao === "anterior" ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Ir para uma data</label>
                <input type="date" value={dataBusca} onChange={(e) => setDataBusca(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={() => irParaData(dataBusca)} disabled={!dataBusca || consultandoData}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                Buscar
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <button onClick={() => { setDataBuscada(""); abrirSnapshot(snapshotIndex - 1); }} disabled={snapshotIndex <= 0 || consultandoData}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 flex-shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center text-xs text-slate-600 min-w-[120px]">
                {consultandoData ? "Carregando..." : consultaResultado ? (
                  <>
                    <p className="font-semibold text-slate-800">
                      {new Date(consultaResultado.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <p className="text-[11px] text-slate-400">por {consultaResultado.criado_por_nome || "—"}</p>
                  </>
                ) : "—"}
              </div>
              <button onClick={() => { setDataBuscada(""); abrirSnapshot(snapshotIndex + 1); }} disabled={snapshotIndex >= snapshotsLista.length - 1 || snapshotIndex < 0 || consultandoData}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 flex-shrink-0">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {dataBuscada && consultaResultado && !consultaResultado.criado_em.startsWith(dataBuscada) && (
              <p className="w-full text-[11px] text-amber-600">
                Sem alteração em {dataBuscada.split("-").reverse().join("/")} — mostrando o registro mais próximo.
              </p>
            )}
            {consultaErro && (
              <p className="w-full text-[11px] text-red-500">{consultaErro}</p>
            )}
          </div>

          {consultaResultado && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2 bg-slate-50 text-left w-24">Horário</th>
                    {DIAS.slice(0, 5).map((d) => (
                      <th key={d} className="border-b border-l border-slate-200 px-2 py-2 bg-slate-50 text-left min-w-[140px]">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORARIOS.map((horario) => (
                    <tr key={horario}>
                      <td className="border-b border-slate-100 px-2 py-2 font-semibold text-slate-600 align-top">{horario}</td>
                      {DIAS.slice(0, 5).map((d) => {
                        const doDia = consultaResultado.dados.filter((s) => s.dia === d && s.horario === horario);
                        return (
                          <td key={d} className="border-b border-l border-slate-100 px-2 py-2 align-top">
                            {doDia.map((s) => (
                              <div key={s.id} className="mb-1 last:mb-0">
                                <strong>{s.crianca}</strong> · {s.servico}
                                {s.profissional_nome && <div className="opacity-70">👤 {s.profissional_nome}</div>}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : visualizacao === "semana" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-2 py-2 bg-slate-50 text-left w-28">Horário</th>
                {DIAS.slice(0, 5).map((d) => (
                  <th key={d} className="border-b border-l border-slate-200 px-2 py-2 bg-slate-50 text-left min-w-[160px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORARIOS.map((horario) => (
                <tr key={horario}>
                  <td className="border-b border-slate-100 px-2 py-2 font-semibold text-slate-600 align-top">{horario}</td>
                  {DIAS.slice(0, 5).map((d) => {
                    const doDia = slots.filter((s) => {
                      if (s.dia !== d || s.horario !== horario) return false;
                      if (filtroCrianca && s.crianca !== filtroCrianca) return false;
                      if (filtroServico && s.servico !== filtroServico) return false;
                      return true;
                    });
                    return (
                      <td key={d} className="border-b border-l border-slate-100 px-2 py-2 align-top">
                        <div className="flex flex-col gap-1">
                          {doDia.map((s) => (
                            <button key={s.id} onClick={() => podeEditar && abrirEditar(s)}
                              className={`text-left px-1.5 py-1 rounded border ${getCorServico(s.servico, corMap)} ${podeEditar ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}>
                              <strong>{s.crianca}</strong> · {s.servico}
                              {s.profissional_nome && <div className="opacity-70">👤 {s.profissional_nome}</div>}
                              {s.presenca && <span className="ml-1 font-bold">[{s.presenca}]</span>}
                            </button>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                            {podeEditar && (
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
                            )}
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
                          {slot.motivo && (
                            <span className="text-[11px] bg-black/10 rounded px-1.5 py-1 mt-1 leading-snug">
                              ⚠️ {slot.motivo}
                            </span>
                          )}
                          {podeEditar ? (
                            <div className="flex items-center gap-1 mt-1">
                              {PRESENCAS.map((p) => (
                                <button
                                  key={p.valor}
                                  onClick={() => marcarPresenca(slot, p.valor)}
                                  title={p.label}
                                  className={`w-6 h-5 rounded text-[10px] font-bold border transition-colors ${
                                    slot.presenca === p.valor ? p.cor : "bg-white/60 text-current border-current/20 opacity-50 hover:opacity-100"
                                  }`}
                                >
                                  {p.valor}
                                </button>
                              ))}
                            </div>
                          ) : slot.presenca ? (
                            <span className={`inline-block w-fit mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRESENCAS.find((p) => p.valor === slot.presenca)!.cor}`}>
                              {slot.presenca}
                            </span>
                          ) : null}
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
            {erroExclusao && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{erroExclusao}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletandoId(null); setDeletandoLabel(""); setErroExclusao(""); }}
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
                  value={servicoLivre ? "__outro__" : form.servico}
                  onChange={(e) => {
                    if (e.target.value === "__outro__") {
                      setServicoLivre(true);
                      setForm((f) => ({ ...f, servico: "" }));
                    } else {
                      setServicoLivre(false);
                      setForm((f) => ({ ...f, servico: e.target.value }));
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {servicos.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="__outro__">+ Digitar outro serviço...</option>
                </select>
                {servicoLivre && (
                  <input
                    type="text"
                    autoFocus
                    value={form.servico}
                    onChange={(e) => setForm((f) => ({ ...f, servico: e.target.value }))}
                    placeholder="Digite o nome do serviço/especialidade"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
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
                  value={profissionalLivre ? "__outro__" : form.profissional_id}
                  onChange={(e) => {
                    if (e.target.value === "__outro__") {
                      setProfissionalLivre(true);
                      setForm((f) => ({ ...f, profissional_id: "", profissional_nome: "" }));
                    } else {
                      setProfissionalLivre(false);
                      handleProfissional(e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum</option>
                  {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  <option value="__outro__">+ Digitar outro nome...</option>
                </select>
                {profissionalLivre && (
                  <input
                    type="text"
                    autoFocus
                    value={form.profissional_nome}
                    onChange={(e) => setForm((f) => ({ ...f, profissional_nome: e.target.value }))}
                    placeholder="Digite o nome do profissional"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* motivo da mudança/ausência */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Motivo da mudança/ausência (opcional)
                </label>
                <textarea
                  value={form.motivo}
                  onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                  rows={2}
                  placeholder="Ex: trocou de especialista porque..., ausente por atestado médico..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Fica visível pra Gestão e ADM automaticamente.</p>
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

      {/* PAINEL DE HISTÓRICO / CONSULTA COMPROBATÓRIA */}
      {historicoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) setHistoricoAberto(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Histórico de alterações
              </h2>
              <button onClick={() => setHistoricoAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <>
                <div className="px-4 pt-3 pb-1 flex flex-wrap items-end gap-2 border-b border-slate-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">De</label>
                    <input type="date" value={historicoDe} onChange={(e) => setHistoricoDe(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Até</label>
                    <input type="date" value={historicoAte} onChange={(e) => setHistoricoAte(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Criança/profissional</label>
                    <input type="text" value={historicoBusca} onChange={(e) => setHistoricoBusca(e.target.value)}
                      placeholder="Buscar por nome..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={() => carregarHistorico()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Buscar
                  </button>
                  {(historicoDe || historicoAte || historicoBusca) && (
                    <button onClick={() => { setHistoricoDe(""); setHistoricoAte(""); setHistoricoBusca(""); carregarHistorico({ de: "", ate: "", busca: "" }); }}
                      className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5">
                      Limpar
                    </button>
                  )}
                </div>
                <p className="px-4 pt-2 text-[11px] text-slate-400">
                  Mostra só os atendimentos que foram editados ou excluídos — quem nunca mexeu não aparece aqui.
                </p>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                  {carregandoHistorico ? (
                    <p className="text-center text-sm text-slate-400 py-8">Carregando...</p>
                  ) : historico.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">Nenhuma alteração registrada ainda.</p>
                  ) : (
                    historico.map((h) => (
                      <div key={h.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            h.acao === "exclusao" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {h.acao === "exclusao" ? "Excluído" : "Editado"}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto">
                            {new Date(h.editado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 mt-1.5">{h.crianca} · {h.servico}</p>
                        <p className="text-xs text-slate-500">{h.dia}, {h.horario}</p>
                        {h.profissional_nome && <p className="text-xs text-slate-500">👤 {h.profissional_nome}</p>}
                        {h.presenca && <p className="text-xs text-slate-500">Presença: {h.presenca}</p>}
                        {h.motivo && <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded px-2 py-1">⚠️ {h.motivo}</p>}
                        <p className="text-[11px] text-slate-400 mt-1.5 border-t border-slate-100 pt-1.5">
                          Versão anterior por <strong>{h.editado_por_nome || h.editado_por_email}</strong>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
          </div>
        </div>
      )}
    </div>

    {/* VERSÃO PRA IMPRIMIR — uma grade separada por função, pro mural físico (sem motivo/presença) */}
    <div className="hidden print:block">
      {rolesParaImprimir.map((r, i) => {
        const slotsDoRole = slots.filter((s) => s.profissional_id && roleDoProfissional[s.profissional_id] === r);
        return (
          <div key={r} className={i > 0 ? "break-before-page" : ""}>
            <h1 className="text-xl font-bold text-slate-900 text-center mb-1">{titulo}</h1>
            <p className="text-sm font-semibold text-slate-700 text-center mb-1">{LABEL_ROLE[r] || r}</p>
            <p className="text-xs text-slate-500 text-center mb-4">
              Escala semanal — impresso em {new Date().toLocaleDateString("pt-BR")}
            </p>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="border border-slate-300 px-1.5 py-1 bg-slate-100 text-left w-24">Horário</th>
                  {DIAS.slice(0, 5).map((d) => (
                    <th key={d} className="border border-slate-300 px-1.5 py-1 bg-slate-100 text-left">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORARIOS.map((horario) => (
                  <tr key={horario}>
                    <td className="border border-slate-300 px-1.5 py-1 font-semibold align-top">{horario}</td>
                    {DIAS.slice(0, 5).map((d) => {
                      const doDia = slotsDoRole.filter((s) => s.dia === d && s.horario === horario);
                      return (
                        <td key={d} className="border border-slate-300 px-1.5 py-1 align-top">
                          {doDia.map((s) => (
                            <div key={s.id} className="mb-1 last:mb-0">
                              <strong>{s.crianca}</strong> · {s.servico}
                              {s.profissional_nome && <> — {s.profissional_nome}</>}
                              {s.local && <> ({s.local})</>}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
    </div>
  );
}
