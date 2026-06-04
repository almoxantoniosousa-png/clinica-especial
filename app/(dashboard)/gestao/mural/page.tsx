"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Pin } from "lucide-react";

export default function GestaoMuralPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [fixado, setFixado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [autorId, setAutorId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (user) setAutorId(user.id);
    });
  }, []);

  async function carregar() {
    setLoading(true); setErro("");
    const { data, error } = await supabase
      .from("mural")
      .select("*, atendentes(nome)")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) { setErro("Erro ao carregar o mural: " + error.message); setLoading(false); return; }
    setComunicados(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function publicar() {
    if (!titulo.trim()) { mostrarFeedback("erro", "Informe o título do comunicado."); return; }
    if (!conteudo.trim()) { mostrarFeedback("erro", "Informe o conteúdo do comunicado."); return; }
    setSalvando(true);
    const { error } = await supabase.from("mural").insert({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      fixado,
      ...(autorId ? { atendente_id: autorId } : {}),
    });
    setSalvando(false);
    if (error) { mostrarFeedback("erro", error.message); return; }
    mostrarFeedback("sucesso", "Comunicado publicado no mural!");
    setModal(false); setTitulo(""); setConteudo(""); setFixado(false);
    carregar();
  }

  async function deletar() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("mural").delete().eq("id", deletandoId);
    setDeletandoId(null); setExcluindo(false);
    mostrarFeedback("sucesso", "Comunicado removido.");
    carregar();
  }

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/gestao/dashboard")}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
              <h1 className="text-2xl font-bold text-blue-900">Mural</h1>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">Comunicados e Avisos</p>
          </div>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
          📢 Publicar
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"/>
          <p className="text-sm text-slate-400">Carregando comunicados...</p>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregar} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">Tentar novamente</button>
        </div>
      ) : comunicados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-slate-400">Nenhum comunicado publicado ainda.</p>
          <button onClick={() => setModal(true)} className="text-xs text-blue-600 hover:underline">Publicar o primeiro</button>
        </div>
      ) : (
        <div className="space-y-3">
          {comunicados.map(c => (
            <div key={c.id} className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3
              ${c.fixado ? "border-amber-200 border-l-4 border-l-amber-400" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {c.fixado && <Pin className="h-4 w-4 text-amber-500 shrink-0"/>}
                  <h3 className="font-bold text-slate-800 text-base">{c.titulo}</h3>
                </div>
                <button onClick={() => setDeletandoId(c.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0">
                  🗑️
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{c.conteudo}</p>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-slate-500">{c.atendentes?.nome || "Gestão"}</span>
                  {" · "}
                  {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-2xl">🗑️</div>
              <div>
                <h3 className="font-bold text-slate-800">Remover comunicado?</h3>
                <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} disabled={excluindo}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={deletar} disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">
                {excluindo ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal publicar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📢 Novo Comunicado</h2>
              <button onClick={() => setModal(false)} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título *</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Reunião de equipe na quinta-feira"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Conteúdo *</label>
                <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
                  placeholder="Escreva o comunicado aqui..." rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${fixado ? "bg-amber-500" : "bg-slate-200"}`}
                  onClick={() => setFixado(v => !v)}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${fixado ? "translate-x-4" : ""}`}/>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Fixar no topo</p>
                  <p className="text-xs text-slate-400">Aparece antes dos outros comunicados</p>
                </div>
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button onClick={publicar} disabled={salvando || !titulo.trim() || !conteudo.trim()}
                  className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
                  {salvando ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
