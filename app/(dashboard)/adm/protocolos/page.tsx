"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { Plus, Pencil, Trash2, X, Check, Send, ClipboardCheck, ChevronDown } from "lucide-react";

const CARGOS = [
  "Especialista",
  "Acompanhante Terapêutico (AT)",
  "Supervisora",
  "Auxiliar Administrativo",
  "Agente de Limpeza",
  "Gestão",
  "Financeiro",
];

const ROLE_LABEL: Record<string, string> = { supervisora: "Supervisora", gestao: "Gestão" };

type Protocolo = { id: string; cargo: string; titulo: string; conteudo: string; created_at: string };
type Pessoa = { id: string; nome: string; role: string };
type Confirmacao = { protocolo_id: string; pessoa_nome: string; pessoa_role: string; confirmado_em: string };

const FORM_VAZIO = { cargo: CARGOS[0], titulo: "", conteudo: "" };

export default function ProtocolosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [eu, setEu] = useState<Pessoa | null>(null);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCargo, setFiltroCargo] = useState<string>("todos");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Protocolo | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [deletando, setDeletando] = useState<Protocolo | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const [enviando, setEnviando] = useState<Protocolo | null>(null);
  const [destinatarios, setDestinatarios] = useState<Pessoa[]>([]);
  const [enviandoPara, setEnviandoPara] = useState<string | null>(null);

  const [confirmacoes, setConfirmacoes] = useState<Record<string, Confirmacao[]>>({});
  const [expandido, setExpandido] = useState<string | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("usuarios").select("id, nome, role").eq("email", user.email).maybeSingle();
      if (data) setEu(data as Pessoa);
    })();
  }, [supabase]);

  async function carregar() {
    setLoading(true);
    const [{ data: prot }, { data: conf }] = await Promise.all([
      supabase.from("protocolos_conduta").select("*").order("cargo").order("titulo"),
      supabase.from("protocolos_confirmacoes").select("protocolo_id, pessoa_nome, pessoa_role, confirmado_em").order("confirmado_em", { ascending: false }),
    ]);
    setProtocolos((prot || []) as Protocolo[]);
    const mapa: Record<string, Confirmacao[]> = {};
    for (const c of (conf || []) as Confirmacao[]) {
      (mapa[c.protocolo_id] ||= []).push(c);
    }
    setConfirmacoes(mapa);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const cargosComProtocolo = useMemo(() => Array.from(new Set(protocolos.map(p => p.cargo))), [protocolos]);

  const protocolosFiltrados = useMemo(() =>
    filtroCargo === "todos" ? protocolos : protocolos.filter(p => p.cargo === filtroCargo),
  [protocolos, filtroCargo]);

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setModal(true); }

  function abrirEditar(p: Protocolo) {
    setEditando(p);
    setForm({ cargo: p.cargo, titulo: p.titulo, conteudo: p.conteudo });
    setModal(true);
  }

  function fecharModal() { setModal(false); setEditando(null); setForm(FORM_VAZIO); }

  async function salvar() {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      mostrarFeedback("erro", "Preencha título e conteúdo."); return;
    }
    setSalvando(true);
    const payload = {
      cargo: form.cargo, titulo: form.titulo.trim(), conteudo: form.conteudo.trim(),
      updated_at: new Date().toISOString(),
    };
    const { error } = editando
      ? await supabase.from("protocolos_conduta").update(payload).eq("id", editando.id)
      : await supabase.from("protocolos_conduta").insert([payload]);
    if (error) mostrarFeedback("erro", "Erro ao salvar. Tente novamente.");
    else {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        usuario_nome: eu?.nome,
        acao: editando ? "Editou" : "Criou",
        tabela: "protocolos_conduta",
        registro_id: editando?.id,
        descricao: `${editando ? "Editou" : "Criou"} o protocolo de conduta "${form.titulo.trim()}" (${form.cargo})`,
      });
      mostrarFeedback("sucesso", editando ? "Protocolo atualizado!" : "Protocolo criado!");
      fecharModal();
      await carregar();
    }
    setSalvando(false);
  }

  async function excluir() {
    if (!deletando) return;
    setExcluindo(true);
    const { error } = await supabase.from("protocolos_conduta").delete().eq("id", deletando.id);
    setExcluindo(false);
    if (error) mostrarFeedback("erro", "Erro ao remover. Tente novamente.");
    else {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        usuario_nome: eu?.nome,
        acao: "Excluiu",
        tabela: "protocolos_conduta",
        registro_id: deletando.id,
        descricao: `Excluiu o protocolo de conduta "${deletando.titulo}" (${deletando.cargo})`,
      });
      mostrarFeedback("sucesso", "Protocolo removido.");
      setProtocolos(prev => prev.filter(p => p.id !== deletando.id));
    }
    setDeletando(null);
  }

  // ── Enviar pelo chat ──────────────────────────────────────────────────────

  async function abrirEnvio(p: Protocolo) {
    setEnviando(p);
    if (destinatarios.length > 0) return;
    const [{ data: us }, { data: at }] = await Promise.all([
      supabase.from("usuarios").select("id, nome, role").in("role", ["supervisora", "gestao"]),
      supabase.from("atendentes").select("id, nome, role").in("role", ["supervisora", "gestao"]),
    ]);
    const vistos = new Set<string>();
    const todos: Pessoa[] = [];
    for (const pessoa of [...((us || []) as Pessoa[]), ...((at || []) as Pessoa[])]) {
      if (vistos.has(pessoa.id)) continue;
      vistos.add(pessoa.id);
      todos.push(pessoa);
    }
    setDestinatarios(todos);
  }

  function fecharEnvio() { setEnviando(null); setEnviandoPara(null); }

  async function enviarPara(destinatario: Pessoa) {
    if (!enviando || !eu) return;
    setEnviandoPara(destinatario.id);
    try {
      const { data: minhasConversas } = await supabase
        .from("conversas")
        .select("id, participante_a, participante_b")
        .or(`participante_a.eq.${eu.id},participante_b.eq.${eu.id}`);

      const existente = (minhasConversas || []).find((c: { id: string; participante_a: string; participante_b: string }) =>
        c.participante_a === destinatario.id || c.participante_b === destinatario.id
      );

      let conversaId = existente?.id as string | undefined;
      if (!conversaId) {
        const { data: nova, error: errConversa } = await supabase
          .from("conversas")
          .insert({ nome: `${eu.nome} ↔ ${destinatario.nome}`, tipo: "privado", participante_a: eu.id, participante_b: destinatario.id })
          .select("id").single();
        if (errConversa || !nova) throw errConversa;
        conversaId = nova.id;
      }

      const texto = `📋 Protocolo de Conduta — ${enviando.cargo}\n\n${enviando.titulo}\n\n${enviando.conteudo}`;
      const { error: errMsg } = await supabase
        .from("mensagens_chat")
        .insert({ conversa_id: conversaId, autor_id: eu.id, conteudo: texto, lida: false });
      if (errMsg) throw errMsg;

      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        usuario_nome: eu.nome,
        acao: "Enviou",
        tabela: "protocolos_conduta",
        registro_id: enviando.id,
        descricao: `Enviou o protocolo "${enviando.titulo}" (${enviando.cargo}) pelo chat para ${destinatario.nome}`,
      });

      mostrarFeedback("sucesso", `Protocolo enviado para ${destinatario.nome}.`);
      fecharEnvio();
    } catch {
      mostrarFeedback("erro", "Erro ao enviar. Tente novamente.");
      setEnviandoPara(null);
    }
  }

  const sel = "w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inp = "w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5 pb-10">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Protocolos de Conduta</h1>
          <p className="text-xs text-slate-400 mt-0.5">Diretrizes de conduta e atividades por cargo</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="h-4 w-4" /> Novo Protocolo
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
          feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>{feedback.msg}
        </div>
      )}

      {cargosComProtocolo.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltroCargo("todos")}
            className={`h-8 px-3 text-xs font-semibold rounded-full border transition ${
              filtroCargo === "todos" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            Todos
          </button>
          {cargosComProtocolo.map(c => (
            <button key={c} onClick={() => setFiltroCargo(c)}
              className={`h-8 px-3 text-xs font-semibold rounded-full border transition ${
                filtroCargo === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : protocolosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📜</span>
          <p className="text-sm text-slate-400">Nenhum protocolo cadastrado{filtroCargo !== "todos" ? ` para ${filtroCargo}` : ""}.</p>
          <button onClick={abrirNovo} className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition">
            + Cadastrar protocolo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {protocolosFiltrados.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5 min-w-0">
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                    {p.cargo}
                  </span>
                  <h3 className="font-bold text-slate-800 text-base">{p.titulo}</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => abrirEnvio(p)}
                    className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-100 transition">
                    <Send className="h-3 w-3" /> Enviar
                  </button>
                  <button onClick={() => abrirEditar(p)}
                    className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button onClick={() => setDeletando(p)}
                    className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition">
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{p.conteudo}</p>

              <div className="pt-2 border-t border-slate-100">
                <button onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {(confirmacoes[p.id]?.length || 0)} confirmação{(confirmacoes[p.id]?.length || 0) !== 1 ? "ões" : ""} de leitura
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandido === p.id ? "rotate-180" : ""}`} />
                </button>
                {expandido === p.id && (
                  <div className="mt-2 space-y-1.5">
                    {(confirmacoes[p.id]?.length || 0) === 0 ? (
                      <p className="text-xs text-slate-400">Ninguém confirmou a leitura ainda.</p>
                    ) : confirmacoes[p.id].map((c, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-semibold text-slate-700">{c.pessoa_nome}</span>
                        <span className="text-slate-400">
                          {new Date(c.confirmado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{editando ? "Editar Protocolo" : "Novo Protocolo"}</h2>
                <p className="text-xs text-slate-400">Diretriz de conduta para um cargo</p>
              </div>
              <button onClick={fecharModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargo *</label>
                <select value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} className={sel}>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Deveres diários do Especialista" className={inp} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conteúdo *</label>
                <textarea rows={8} value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  placeholder="Descreva as diretrizes, deveres e normas de conduta..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3 flex-shrink-0">
              <button onClick={fecharModal} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {salvando ? "Salvando..." : <><Check className="h-4 w-4" />{editando ? "Salvar" : "Criar protocolo"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {deletando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover protocolo?</h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">{deletando.titulo}</p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletando(null)} disabled={excluindo}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={excluir} disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">
                {excluindo ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal enviar pelo chat */}
      {enviando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) fecharEnvio(); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-800">Enviar protocolo pelo chat</h2>
                <p className="text-xs text-slate-400 truncate">{enviando.titulo}</p>
              </div>
              <button onClick={fecharEnvio} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 flex-shrink-0">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1 flex-1">
              {destinatarios.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Carregando contatos...</p>
              ) : destinatarios.map(d => (
                <button key={d.id} onClick={() => enviarPara(d)} disabled={!!enviandoPara}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left disabled:opacity-50">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-700 flex-shrink-0">
                    {d.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{d.nome}</p>
                    <p className="text-xs text-slate-400">{ROLE_LABEL[d.role] || d.role}</p>
                  </div>
                  {enviandoPara === d.id && <span className="text-xs text-slate-400 flex-shrink-0">Enviando...</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
