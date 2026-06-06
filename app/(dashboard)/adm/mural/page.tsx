"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Trash2 } from "lucide-react";

export default function MuralPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [autorNome, setAutorNome] = useState("");
  const [autorId, setAutorId] = useState("");

  // Form
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [destinatario, setDestinatario] = useState("todos");
  const [fixado, setFixado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Exclusão
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoTitulo, setDeletandoTitulo] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAutorId(user.id);
      const { data: perfil } = await supabase
        .from("atendentes")
        .select("nome, role")
        .eq("email", user.email)
        .maybeSingle();
      if (perfil) {
        setAutorNome(perfil.nome);
        setIsAdmin(perfil.role === "adm");
      }
    }

    const { data } = await supabase
      .from("mural")
      .select("*, atendentes(nome)")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false });

    setComunicados(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvarComunicado(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    setSalvando(true);

    const { error } = await supabase.from("mural").insert([{
      autor_id: autorId,
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      destinatario,
      fixado,
    }]);

    setSalvando(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao publicar: " + error.message);
    } else {
      mostrarFeedback("sucesso", "Comunicado publicado com sucesso!");
      setTitulo(""); setConteudo(""); setDestinatario("todos"); setFixado(false);
      setMostrarForm(false);
      carregar();
    }
  }

  async function toggleFixado(id: string, atual: boolean) {
    await supabase.from("mural").update({ fixado: !atual }).eq("id", id);
    carregar();
  }

  async function excluir() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("mural").delete().eq("id", deletandoId);
    setDeletandoId(null);
    setDeletandoTitulo("");
    setExcluindo(false);
    carregar();
    mostrarFeedback("sucesso", "Comunicado removido.");
  }

  const badgeDestinatario: any = {
    todos: { label: "Para todos", color: "bg-blue-50 text-blue-700 border-blue-100" },
    adm: { label: "Apenas ADM", color: "bg-purple-50 text-purple-700 border-purple-100" },
    atendente: { label: "Atendentes", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mural</h1>
          <p className="text-xs text-slate-400 mt-0.5">Comunicados e avisos da clínica</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="self-start sm:self-auto flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700
              text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
          >
            <span>{mostrarForm ? "✕ Cancelar" : "+ Novo Comunicado"}</span>
          </button>
        )}
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* FORM NOVO COMUNICADO */}
      {mostrarForm && isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Novo Comunicado</h2>
          <form onSubmit={salvarComunicado} className="space-y-4">

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Título</label>
              <input
                type="text"
                required
                placeholder="Ex: Reunião de equipe — Sexta-feira"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mensagem</label>
              <textarea
                required
                rows={4}
                placeholder="Escreva o comunicado aqui..."
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Destinatário</label>
                <select
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-800
                    bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="todos">Para todos</option>
                  <option value="atendente">Apenas Atendentes</option>
                  <option value="adm">Apenas ADM</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer select-none h-12 px-4 w-full
                  rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={fixado}
                    onChange={(e) => setFixado(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700">📌 Fixar no topo</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm
                rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {salvando ? "Publicando..." : "Publicar Comunicado"}
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE COMUNICADOS */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando comunicados...</p>
        </div>
      ) : comunicados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-slate-400 font-medium">Nenhum comunicado publicado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comunicados.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3
                ${c.fixado ? "border-amber-200 border-l-4 border-l-amber-400" : "border-slate-200"}`}
            >
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.fixado && <span className="text-amber-500 text-sm">📌</span>}
                  <h3 className="font-bold text-slate-800 text-base">{c.titulo}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border
                    ${badgeDestinatario[c.destinatario]?.color}`}>
                    {badgeDestinatario[c.destinatario]?.label}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleFixado(c.id, c.fixado)}
                      className={`h-8 px-3 text-xs font-semibold rounded-lg border transition
                        ${c.fixado
                          ? "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                    >
                      {c.fixado ? "Desafixar" : "Fixar"}
                    </button>
                    <button
                      onClick={() => { setDeletandoId(c.id); setDeletandoTitulo(c.titulo); }}
                      className="h-8 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100
                        rounded-lg border border-red-100 transition"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.conteudo}</p>

              {/* Rodapé */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  bg-blue-100 text-blue-700`}>
                  {c.atendentes?.nome?.charAt(0).toUpperCase() || "?"}
                </div>
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-slate-500">{c.atendentes?.nome || "Desconhecido"}</span>
                  {" · "}
                  {new Date(c.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover comunicado?</h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">{deletandoTitulo}</p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletandoId(null); setDeletandoTitulo(""); }}
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
    </div>
  );
}