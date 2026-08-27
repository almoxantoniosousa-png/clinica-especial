"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { Plus, Pencil, Trash2, X, ExternalLink, BookOpen } from "lucide-react";

type Lei = { id: string; titulo: string; descricao: string; etiqueta: string | null; link: string; created_at: string };

const FORM_VAZIO = { titulo: "", descricao: "", etiqueta: "", link: "" };

export default function LegislacaoApoioAdmPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [eu, setEu] = useState<{ nome: string } | null>(null);
  const [leis, setLeis] = useState<Lei[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Lei | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [deletando, setDeletando] = useState<Lei | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data } = await supabase.from("usuarios").select("nome").eq("email", user.email).maybeSingle();
        if (data) setEu(data as { nome: string });
      }
    })();
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from("legislacao_apoio").select("*").order("created_at");
    setLeis((data || []) as Lei[]);
    setLoading(false);
  }

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setErro(""); setModal(true); }
  function abrirEditar(l: Lei) { setEditando(l); setForm({ titulo: l.titulo, descricao: l.descricao, etiqueta: l.etiqueta || "", link: l.link }); setErro(""); setModal(true); }
  function fecharModal() { setModal(false); setEditando(null); }

  async function salvar() {
    if (!form.titulo.trim() || !form.descricao.trim() || !form.link.trim()) {
      setErro("Preencha título, descrição e link.");
      return;
    }
    setSalvando(true);
    setErro("");

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      etiqueta: form.etiqueta.trim() || null,
      link: form.link.trim(),
    };

    const { error } = editando
      ? await supabase.from("legislacao_apoio").update(payload).eq("id", editando.id)
      : await supabase.from("legislacao_apoio").insert([payload]);

    if (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      usuario_nome: eu?.nome,
      acao: editando ? "Editou lei" : "Cadastrou lei",
      tabela: "legislacao_apoio",
      descricao: `${editando ? "Editou" : "Cadastrou"} "${payload.titulo}" em Legislação de Apoio`,
    });

    mostrarFeedback("sucesso", editando ? "Lei atualizada." : "Lei cadastrada.");
    fecharModal();
    await carregar();
    setSalvando(false);
  }

  async function excluir() {
    if (!deletando) return;
    setExcluindo(true);
    const { error } = await supabase.from("legislacao_apoio").delete().eq("id", deletando.id);
    setExcluindo(false);
    if (error) { mostrarFeedback("erro", "Erro ao remover. Tente novamente."); setDeletando(null); return; }

    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      usuario_nome: eu?.nome,
      acao: "Excluiu lei",
      tabela: "legislacao_apoio",
      registro_id: deletando.id,
      descricao: `Excluiu "${deletando.titulo}" de Legislação de Apoio`,
    });
    mostrarFeedback("sucesso", "Lei removida.");
    setLeis(prev => prev.filter(l => l.id !== deletando.id));
    setDeletando(null);
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition bg-white";
  const labelClass = "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block";

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📚 Legislação de Apoio</h1>
          <p className="text-xs text-slate-400 mt-0.5">Leis e normas que amparam a atuação em psicologia e os direitos da criança especial</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="h-4 w-4" /> Nova lei
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
          feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>{feedback.msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : leis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhuma lei cadastrada ainda.</p>
          <button onClick={abrirNovo} className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition">
            + Cadastrar lei
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {leis.map(l => (
            <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5 min-w-0">
                  {l.etiqueta && (
                    <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-100">
                      {l.etiqueta}
                    </span>
                  )}
                  <h3 className="font-bold text-slate-800 text-base">{l.titulo}</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => abrirEditar(l)}
                    className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-100 transition">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button onClick={() => setDeletando(l)}
                    className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-100 transition">
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{l.descricao}</p>
              <a href={l.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-blue-700 rounded-lg border border-slate-200 transition break-all">
                <ExternalLink className="h-3 w-3 flex-shrink-0" /> {l.link}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{editando ? "Editar lei" : "Nova lei"}</h2>
                <p className="text-xs text-slate-400">Legislação de Apoio</p>
              </div>
              <button onClick={fecharModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

              <div>
                <label className={labelClass}>Título da lei</label>
                <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Lei nº 12.764/2012 — Lei Berenice Piana" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Descrição curta</label>
                <textarea rows={3} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                  placeholder="O que essa lei garante..." className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className={labelClass}>Etiqueta (opcional)</label>
                <input type="text" value={form.etiqueta} onChange={e => setForm({ ...form, etiqueta: e.target.value })}
                  placeholder="Ex: Autismo, LGPD, Direitos..." className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Link oficial</label>
                <input type="text" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..." className={inputClass} />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0">
              <button onClick={fecharModal}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="h-10 px-4 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {deletando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setDeletando(null); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Excluir "{deletando.titulo}"?</h3>
              <p className="text-xs text-slate-400 mt-1">Essa ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletando(null)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={excluir} disabled={excluindo}
                className="h-9 px-4 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
