"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { AnexoDocumentos, type DocumentoAnexo } from "@/components/anexo-documentos";

type Categoria = "especialista" | "atendente" | "supervisora" | "apoio";
type Tabela = "atendentes" | "colaboradoras_internas" | "usuarios";

// Supervisoras confirmadas que vivem na tabela "usuarios" (login/permissões
// à parte, não mexidas aqui — só entram na listagem/cadastro).
const SUPERVISORAS_USUARIOS_IDS = [
  "7323d537-e397-4a2a-9152-2784ae20a109", // Carolina Borges
];

const CARGOS_APOIO = ["Auxiliar Administrativa", "Agente de Limpeza"];

const MOTIVOS_SAIDA = [
  "Pedido de demissão",
  "Demissão sem justa causa",
  "Demissão por justa causa",
  "Término de contrato",
  "Abandono de emprego",
];

const CATEGORIAS: { valor: Categoria; label: string; labelSingular: string; icone: string; cor: string }[] = [
  { valor: "especialista", label: "Especialistas", labelSingular: "Especialista", icone: "🩺", cor: "purple" },
  { valor: "atendente", label: "Acompanhantes Terapêuticos", labelSingular: "Acompanhante Terapêutico", icone: "👤", cor: "emerald" },
  { valor: "supervisora", label: "Supervisoras", labelSingular: "Supervisora", icone: "🧭", cor: "amber" },
  { valor: "apoio", label: "Apoio", labelSingular: "Apoio", icone: "🏠", cor: "blue" },
];

// Classes pré-compostas (inclusive variantes hover:/file:) — o Tailwind só
// gera CSS pra strings de classe que aparecem literalmente no código-fonte,
// então concatenar variante + cor em runtime (ex: `hover:${cor.bg}`) não funciona.
const CORES: Record<string, { badge: string; btnAtivo: string; btnInativo: string; fileInput: string }> = {
  purple: {
    badge: "bg-purple-50 text-purple-700",
    btnAtivo: "bg-purple-600 hover:bg-purple-700 text-white",
    btnInativo: "bg-white text-purple-700 border-purple-100 hover:bg-purple-50",
    fileInput: "file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700",
    btnAtivo: "bg-emerald-600 hover:bg-emerald-700 text-white",
    btnInativo: "bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50",
    fileInput: "file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100",
  },
  amber: {
    badge: "bg-amber-50 text-amber-700",
    btnAtivo: "bg-amber-600 hover:bg-amber-700 text-white",
    btnInativo: "bg-white text-amber-700 border-amber-100 hover:bg-amber-50",
    fileInput: "file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100",
  },
  blue: {
    badge: "bg-blue-50 text-blue-700",
    btnAtivo: "bg-blue-600 hover:bg-blue-700 text-white",
    btnInativo: "bg-white text-blue-700 border-blue-100 hover:bg-blue-50",
    fileInput: "file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100",
  },
};

interface Colaborador {
  id: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  cnpj: string | null;
  razao_social: string | null;
  data_demissao: string | null;
  motivo_saida: string | null;
  ativo: boolean;
  documentos: DocumentoAnexo[] | null;
  especialidade?: string | null;
  registro_profissional?: string | null;
  cargo?: string | null;
  data_admissao?: string | null;
  faz_adaptado?: boolean;
  _tabela: Tabela;
  _categoria: Categoria;
}

const FORM_VAZIO = {
  categoria: "atendente" as Categoria,
  nome: "", email: "", whatsapp: "", cpf: "", rg: "",
  data_nascimento: "", endereco: "", cnpj: "", razao_social: "",
  data_demissao: "", motivo_saida: "",
  especialidade: "", registro_profissional: "",
  cargo: CARGOS_APOIO[0], cargoLivre: "", data_admissao: "",
  faz_adaptado: false,
};

export default function ColaboradoresPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | "todos">("todos");
  const [listaAberta, setListaAberta] = useState(true);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [form, setForm] = useState(FORM_VAZIO);
  const [documentosPendentes, setDocumentosPendentes] = useState<File[]>([]);
  const [enviandoDocumentos, setEnviandoDocumentos] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  function mascaraCpf(valor: string): string {
    return valor
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function cpfValido(cpf: string): boolean {
    const n = cpf.replace(/\D/g, "");
    if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(n[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto >= 10) resto = 0;
    if (resto !== parseInt(n[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(n[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto >= 10) resto = 0;
    return resto === parseInt(n[10]);
  }

  async function getUsuarioLogado() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  async function enviarDocumentosPendentes(registroId: string): Promise<DocumentoAnexo[]> {
    if (documentosPendentes.length === 0) return [];
    setEnviandoDocumentos(true);
    const docs: DocumentoAnexo[] = [];
    for (const file of documentosPendentes) {
      const caminho = `${registroId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documentos-cadastro").upload(caminho, file);
      if (!error) {
        const { data } = supabase.storage.from("documentos-cadastro").getPublicUrl(caminho);
        docs.push({ nome: file.name, url: data.publicUrl });
      }
    }
    setEnviandoDocumentos(false);
    return docs;
  }

  const carregarTodos = async () => {
    setLoadingLista(true);
    const [atendentesRes, internasRes, supervisorasUsuariosRes] = await Promise.all([
      supabase.from("atendentes").select("*").in("role", ["especialista", "atendente", "supervisora"]),
      supabase.from("colaboradoras_internas").select("*"),
      supabase.from("usuarios").select("*").in("id", SUPERVISORAS_USUARIOS_IDS),
    ]);
    const doAtendentes: Colaborador[] = (atendentesRes.data ?? []).map((r: any) => ({
      ...r, _tabela: "atendentes" as Tabela, _categoria: r.role as Categoria,
    }));
    const doApoio: Colaborador[] = (internasRes.data ?? []).map((r: any) => ({
      ...r, _tabela: "colaboradoras_internas" as Tabela, _categoria: "apoio" as Categoria,
    }));
    const doSupervisorasUsuarios: Colaborador[] = (supervisorasUsuariosRes.data ?? []).map((r: any) => ({
      ...r, whatsapp: r.telefone, _tabela: "usuarios" as Tabela, _categoria: "supervisora" as Categoria,
    }));
    setColaboradores([...doAtendentes, ...doApoio, ...doSupervisorasUsuarios].sort((a, b) => a.nome.localeCompare(b.nome)));
    setLoadingLista(false);
  };

  useEffect(() => { carregarTodos(); }, [supabase]);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.cpf && !cpfValido(form.cpf)) {
      mostrarFeedback("erro", "CPF inválido. Verifique o número informado.");
      return;
    }
    setLoading(true);

    const camposComuns = {
      nome: form.nome, email: form.email ? form.email.trim().toLowerCase() : null, whatsapp: form.whatsapp || null,
      cpf: form.cpf || null, rg: form.rg || null,
      data_nascimento: form.data_nascimento || null,
      endereco: form.endereco || null,
      cnpj: form.cnpj || null, razao_social: form.razao_social || null,
      data_demissao: form.data_demissao || null, motivo_saida: form.motivo_saida || null,
    };

    const tabela: Tabela = form.categoria === "apoio" ? "colaboradoras_internas" : "atendentes";
    const payload = form.categoria === "apoio"
      ? { ...camposComuns, cargo: form.cargo, data_admissao: form.data_admissao || null }
      : {
          ...camposComuns, especialidade: form.especialidade || null, registro_profissional: form.registro_profissional || null,
          cargo: form.cargoLivre || null, role: form.categoria,
          ...(form.categoria === "atendente" ? { faz_adaptado: form.faz_adaptado } : {}),
        };

    const { data: novo, error } = await supabase.from(tabela).insert([payload]).select().single();

    if (error) {
      mostrarFeedback("erro", "Erro ao cadastrar: " + error.message);
    } else {
      if (novo?.id && documentosPendentes.length > 0) {
        const docs = await enviarDocumentosPendentes(novo.id);
        if (docs.length > 0) await supabase.from(tabela).update({ documentos: docs }).eq("id", novo.id);
      }
      const user = await getUsuarioLogado();
      const categoriaInfo = CATEGORIAS.find((c) => c.valor === form.categoria)!;
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Criou",
        tabela,
        registro_id: novo?.id,
        descricao: `Cadastrou o(a) colaborador(a): ${form.nome} (${categoriaInfo.labelSingular})`,
      });
      mostrarFeedback("sucesso", "Colaborador(a) cadastrado(a) com sucesso!");
      setForm({ ...FORM_VAZIO, categoria: form.categoria });
      setDocumentosPendentes([]);
      carregarTodos();
    }
    setLoading(false);
  };

  async function salvarEdicao() {
    if (!editando) return;
    if (editando.cpf && !cpfValido(editando.cpf)) {
      mostrarFeedback("erro", "CPF inválido. Verifique o número informado.");
      return;
    }
    setSalvandoEdicao(true);

    const camposComuns = {
      nome: editando.nome, email: editando.email ? editando.email.trim().toLowerCase() : editando.email,
      ...(editando._tabela === "usuarios" ? { telefone: editando.whatsapp } : { whatsapp: editando.whatsapp }),
      cpf: editando.cpf, rg: editando.rg,
      data_nascimento: editando.data_nascimento || null,
      endereco: editando.endereco,
      cnpj: editando.cnpj || null, razao_social: editando.razao_social || null,
      data_demissao: editando.data_demissao || null, motivo_saida: editando.motivo_saida || null,
      ativo: editando.ativo !== false,
      documentos: editando.documentos || [],
    };
    const payload = editando._tabela === "colaboradoras_internas"
      ? { ...camposComuns, cargo: editando.cargo, data_admissao: editando.data_admissao || null }
      : {
          ...camposComuns, especialidade: editando.especialidade, registro_profissional: editando.registro_profissional,
          cargo: editando.cargo || null,
          ...(editando._categoria === "atendente" ? { faz_adaptado: editando.faz_adaptado ?? false } : {}),
        };

    const { error } = await supabase.from(editando._tabela).update(payload).eq("id", editando.id);

    if (!error) {
      const user = await getUsuarioLogado();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Editou",
        tabela: editando._tabela,
        registro_id: editando.id,
        descricao: `Editou o(a) colaborador(a): ${editando.nome}`,
      });
    }

    setSalvandoEdicao(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao editar: " + error.message);
    } else {
      setEditando(null);
      carregarTodos();
      mostrarFeedback("sucesso", "Colaborador(a) atualizado(a) com sucesso!");
    }
  }

  async function excluir(col: Colaborador) {
    if (!confirm(`Remover "${col.nome}" da lista?`)) return;
    const { error } = await supabase.from(col._tabela).delete().eq("id", col.id);
    if (!error) {
      const user = await getUsuarioLogado();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: col._tabela,
        registro_id: col.id,
        descricao: `Removeu o(a) colaborador(a): ${col.nome}`,
      });
    }
    if (error) {
      mostrarFeedback("erro", "Erro ao excluir: " + error.message);
    } else {
      carregarTodos();
      mostrarFeedback("sucesso", "Colaborador(a) removido(a).");
    }
  }

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatarPadrao = [
    "bg-slate-100 text-slate-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  ];
  function corAvatar(nome: string) {
    return coresAvatarPadrao[nome.charCodeAt(0) % coresAvatarPadrao.length];
  }

  const filtrados = colaboradores.filter((c) =>
    (filtroCategoria === "todos" || c._categoria === filtroCategoria) &&
    (c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.especialidade || "").toLowerCase().includes(busca.toLowerCase()) ||
    (c.cargo || "").toLowerCase().includes(busca.toLowerCase()))
  );
  const ativos = filtrados.filter((c) => c.ativo !== false);
  const inativos = filtrados.filter((c) => c.ativo === false);

  const inputClass = "w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition";
  const catAtual = CATEGORIAS.find((c) => c.valor === form.categoria)!;
  const cor = CORES[catAtual.cor];

  function CardColaborador({ col }: { col: Colaborador }) {
    const catInfo = CATEGORIAS.find((c) => c.valor === col._categoria)!;
    const corCat = CORES[catInfo.cor];
    return (
      <li className="px-5 py-4 hover:bg-slate-50 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(col.nome)}`}>
              {iniciais(col.nome)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-slate-800 text-sm truncate">{col.nome}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${corCat.badge}`}>{catInfo.icone} {catInfo.labelSingular}</span>
              </div>
              {col.email && <p className="text-xs text-slate-500 truncate">{col.email}</p>}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {col.especialidade && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{col.especialidade}</span>}
                {col.registro_profissional && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{col.registro_profissional}</span>}
                {col.cargo && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{col.cargo}</span>}
                {col.cpf && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">CPF: {col.cpf}</span>}
                {col.data_nascimento && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Nasc: {new Date(col.data_nascimento).toLocaleDateString("pt-BR")}</span>}
                {col.whatsapp && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{col.whatsapp}</span>}
              </div>
              {col.endereco && <p className="text-xs text-slate-400 mt-1 truncate">📍 {col.endereco}</p>}
              {col.data_admissao && <p className="text-xs text-slate-400 mt-1">📅 Admissão: {new Date(col.data_admissao).toLocaleDateString("pt-BR")}</p>}
              {col.cnpj && <p className="text-xs text-slate-400 mt-1">🏢 CNPJ: {col.cnpj}</p>}
              {col.razao_social && <p className="text-xs text-slate-400 truncate">📋 {col.razao_social}</p>}
              {col.data_demissao && <p className="text-xs text-red-400 mt-1">📅 Demissão: {new Date(col.data_demissao).toLocaleDateString("pt-BR")}</p>}
              {col.motivo_saida && <p className="text-xs text-red-400">⚠️ {col.motivo_saida}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setEditando({ ...col })}
              className="h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-lg border border-blue-100 transition-all">
              Editar
            </button>
            {col._tabela !== "usuarios" && (
              <button onClick={() => excluir(col)}
                className="h-9 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 rounded-lg border border-red-100 transition-all">
                Excluir
              </button>
            )}
          </div>
        </div>
      </li>
    );
  }

  const editandoCatInfo = editando ? CATEGORIAS.find((c) => c.valor === editando._categoria)! : null;

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Colaboradores</h1>
          <p className="text-xs text-slate-400 mt-0.5">Especialistas, Acompanhantes Terapêuticos, Supervisoras e Apoio — cadastro único.</p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>
          {colaboradores.length} colaboradores
        </span>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Novo Colaborador</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cor.badge}`}>Cadastro rápido</span>
        </div>

        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Categoria *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => {
              const corBtn = CORES[c.cor];
              const ativo = form.categoria === c.valor;
              return (
                <button key={c.valor} type="button"
                  onClick={() => setForm({ ...FORM_VAZIO, categoria: c.valor })}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                    ${ativo ? `${corBtn.btnAtivo} border-transparent` : corBtn.btnInativo}`}>
                  <span>{c.icone}</span> {c.labelSingular}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleCadastrar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome completo *</label>
              <input type="text" required placeholder="Ex: Ana Paula Silva" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail {form.categoria !== "apoio" && "*"}</label>
              <input type="email" required={form.categoria !== "apoio"} placeholder="Ex: ana@clinica.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
          </div>

          {form.categoria === "apoio" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cargo *</label>
                <select required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={inputClass}>
                  {CARGOS_APOIO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data de Admissão</label>
                <input type="date" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} className={inputClass} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {form.categoria === "especialista" ? "Área de Atuação *" : "Especialidade"}
                </label>
                <input type="text" required={form.categoria === "especialista"} placeholder="Ex: Psicologia, Fonoaudiologia..." value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro Profissional</label>
                <input type="text" placeholder="Ex: CRP 06/123456" value={form.registro_profissional} onChange={(e) => setForm({ ...form, registro_profissional: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cargo / Função</label>
                <input type="text" placeholder="Ex: Supervisora Clínica, Coordenadora Pedagógica..." value={form.cargoLivre} onChange={(e) => setForm({ ...form, cargoLivre: e.target.value })} className={inputClass} />
              </div>
            </div>
          )}

          {form.categoria === "atendente" && (
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <div onClick={() => setForm({ ...form, faz_adaptado: !form.faz_adaptado })}
                className={`w-12 h-6 rounded-full transition-colors ${form.faz_adaptado ? "bg-emerald-500" : "bg-slate-300"} relative`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${form.faz_adaptado ? "left-6" : "left-0.5"}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">📚 Faz material adaptado</span>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CPF</label>
              <input type="text" placeholder="Ex: 000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: mascaraCpf(e.target.value) })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">RG</label>
              <input type="text" placeholder="Ex: 00.000.000-00" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data de Nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</label>
              <input type="text" placeholder="Ex: (71) 99999-9999" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endereço</label>
            <input type="text" placeholder="Ex: Rua das Flores, 123 - Bairro - Salvador/BA" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CNPJ</label>
              <input type="text" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Razão Social</label>
              <input type="text" placeholder="Nome da empresa (MEI, etc.)" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data de Demissão</label>
            <input type="date" value={form.data_demissao} onChange={(e) => setForm({ ...form, data_demissao: e.target.value })} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Motivo de Saída</label>
            <select value={form.motivo_saida} onChange={(e) => setForm({ ...form, motivo_saida: e.target.value })} className={inputClass}>
              <option value="">— Selecione —</option>
              {MOTIVOS_SAIDA.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Documentos (opcional)</label>
            <input type="file" multiple onChange={(e) => setDocumentosPendentes(Array.from(e.target.files || []))}
              className={`w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 ${cor.fileInput} file:text-xs file:font-semibold file:cursor-pointer`} />
            {documentosPendentes.length > 0 && (
              <p className="text-xs text-slate-400">{documentosPendentes.length} arquivo{documentosPendentes.length !== 1 ? "s" : ""} selecionado{documentosPendentes.length !== 1 ? "s" : ""}</p>
            )}
          </div>
          <button type="submit" disabled={loading || enviandoDocumentos}
            className={`w-full h-12 ${cor.btnAtivo} active:scale-95 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-sm`}>
            {loading ? "Cadastrando..." : enviandoDocumentos ? "Enviando documentos..." : `Cadastrar ${catAtual.labelSingular}`}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setListaAberta(!listaAberta)}
          className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700 text-sm">Lista de Colaboradores</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{colaboradores.length}</span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${listaAberta ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {listaAberta && (
          <>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
              <input type="text" placeholder="Buscar por nome, especialidade ou cargo..." value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full sm:w-72 pl-3 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition" />
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setFiltroCategoria("todos")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                    ${filtroCategoria === "todos" ? "bg-slate-700 text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  Todos
                </button>
                {CATEGORIAS.map((c) => {
                  const corBtn = CORES[c.cor];
                  const ativo = filtroCategoria === c.valor;
                  return (
                    <button key={c.valor} type="button" onClick={() => setFiltroCategoria(c.valor)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                        ${ativo ? `${corBtn.btnAtivo} border-transparent` : corBtn.btnInativo}`}>
                      <span>{c.icone}</span> {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {loadingLista ? (
              <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-400">Carregando...</p></div>
            ) : ativos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-4xl">👥</span>
                <p className="text-sm text-slate-400 font-medium">{busca ? "Nenhum colaborador encontrado." : "Nenhum colaborador cadastrado ainda."}</p>
              </div>
            ) : (
              CATEGORIAS.map((c) => {
                const doCategoria = ativos.filter((col) => col._categoria === c.valor);
                if (doCategoria.length === 0) return null;
                return (
                  <div key={c.valor}>
                    <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.icone} {c.label}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{doCategoria.length}</span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {doCategoria.map((col) => <CardColaborador key={col.id} col={col} />)}
                    </ul>
                  </div>
                );
              })
            )}
            {!loadingLista && ativos.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400">Mostrando {ativos.length} colaborador{ativos.length !== 1 ? "es" : ""} ativo{ativos.length !== 1 ? "s" : ""}</p>
              </div>
            )}
          </>
        )}
      </div>

      {inativos.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setMostrarInativos(!mostrarInativos)}
            className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-600 text-sm">Colaboradores Inativos</h3>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{inativos.length}</span>
            </div>
            <span className="text-slate-400 text-sm">{mostrarInativos ? "▾" : "▸"}</span>
          </button>
          {mostrarInativos && (
            <ul className="divide-y divide-slate-100">
              {inativos.map((col) => {
                const catInfo = CATEGORIAS.find((c) => c.valor === col._categoria)!;
                return (
                  <li key={col.id} className="px-5 py-4 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                        {iniciais(col.nome)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-700 text-sm">{col.nome}</p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{catInfo.icone} {catInfo.labelSingular}</span>
                        </div>
                        <p className="text-xs text-slate-400">{col.especialidade || col.cargo || ""}</p>
                        {col.data_demissao && <p className="text-xs text-red-400">📅 Demissão: {new Date(col.data_demissao).toLocaleDateString("pt-BR")}</p>}
                        {col.motivo_saida && <p className="text-xs text-red-400">⚠️ {col.motivo_saida}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {editando && editandoCatInfo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Editar {editandoCatInfo.labelSingular}</h3>
              <button onClick={() => setEditando(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome</label>
                  <input type="text" value={editando.nome} autoFocus onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</label>
                  <input type="text" value={editando.whatsapp || ""} onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail</label>
                <input type="email" value={editando.email || ""} onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>

              {editando._tabela === "colaboradoras_internas" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cargo</label>
                    <select value={editando.cargo || CARGOS_APOIO[0]} onChange={(e) => setEditando({ ...editando, cargo: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                      {CARGOS_APOIO.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Admissão</label>
                    <input type="date" value={editando.data_admissao || ""} onChange={(e) => setEditando({ ...editando, data_admissao: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{editando._categoria === "especialista" ? "Área de Atuação" : "Especialidade"}</label>
                    <input type="text" value={editando.especialidade || ""} onChange={(e) => setEditando({ ...editando, especialidade: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro Profissional</label>
                    <input type="text" value={editando.registro_profissional || ""} onChange={(e) => setEditando({ ...editando, registro_profissional: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cargo / Função</label>
                    <input type="text" placeholder="Ex: Supervisora Clínica, Coordenadora Pedagógica..." value={editando.cargo || ""} onChange={(e) => setEditando({ ...editando, cargo: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                </div>
              )}

              {editando._categoria === "atendente" && (
                <label className="flex items-center gap-3 cursor-pointer w-fit">
                  <div onClick={() => setEditando({ ...editando, faz_adaptado: !editando.faz_adaptado })}
                    className={`w-12 h-6 rounded-full transition-colors ${editando.faz_adaptado ? "bg-emerald-500" : "bg-slate-300"} relative`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${editando.faz_adaptado ? "left-6" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">📚 Faz material adaptado</span>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CPF</label>
                      <input type="text" value={editando.cpf || ""} onChange={(e) => setEditando({ ...editando, cpf: mascaraCpf(e.target.value) })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">RG</label>
                      <input type="text" value={editando.rg || ""} onChange={(e) => setEditando({ ...editando, rg: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data Nascimento</label>
                    <input type="date" value={editando.data_nascimento || ""} onChange={(e) => setEditando({ ...editando, data_nascimento: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endereço</label>
                    <input type="text" value={editando.endereco || ""} onChange={(e) => setEditando({ ...editando, endereco: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CNPJ</label>
                      <input type="text" value={editando.cnpj || ""} onChange={(e) => setEditando({ ...editando, cnpj: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Razão Social</label>
                      <input type="text" value={editando.razao_social || ""} onChange={(e) => setEditando({ ...editando, razao_social: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Motivo de Saída</label>
                      <select value={editando.motivo_saida || ""} onChange={(e) => setEditando({ ...editando, motivo_saida: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                        <option value="">— Selecione —</option>
                        {MOTIVOS_SAIDA.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => {
                            const novoAtivo = !(editando.ativo !== false);
                            setEditando(novoAtivo
                              ? { ...editando, ativo: true, data_demissao: null, motivo_saida: null }
                              : { ...editando, ativo: false });
                          }}
                          className={`w-12 h-6 rounded-full transition-colors ${editando.ativo !== false ? "bg-emerald-500" : "bg-red-400"} relative`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${editando.ativo !== false ? "left-6" : "left-0.5"}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{editando.ativo !== false ? "Ativo" : "Inativo"}</span>
                      </label>
                    </div>
                  </div>
                  <AnexoDocumentos
                    pastaId={editando.id}
                    documentos={editando.documentos || []}
                    onChange={(docs) => setEditando({ ...editando, documentos: docs })}
                  />
            </div>
            {feedback && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
                ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
                {feedback.msg}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition">
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdicao || !editando.nome?.trim()}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold active:scale-95 transition disabled:opacity-50">
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
