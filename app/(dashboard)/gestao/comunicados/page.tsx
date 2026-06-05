"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Aba = "avisos" | "evolucao";

export default function GestaoComunicadosPage() {
  const [aba, setAba] = useState<Aba>("avisos");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  const abas = [
    { id: "avisos",   label: "Avisos",   icon: "📢" },
    { id: "evolucao", label: "Evolução", icon: "📊" },
  ];

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Comunicação com a Família</h1>
        <p className="text-xs text-slate-400 mt-0.5">Publique avisos e registros de evolução para as famílias</p>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* ABAS */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id as Aba)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${aba === a.id ? "bg-blue-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            <span>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {aba === "avisos"   && <AbaAvisos   mostrarFeedback={mostrarFeedback} />}
      {aba === "evolucao" && <AbaEvolucao mostrarFeedback={mostrarFeedback} />}
    </div>
  );
}

// =============================================
// ABA AVISOS
// =============================================
function AbaAvisos({ mostrarFeedback }: any) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoLabel, setDeletandoLabel] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const [{ data: av }, { data: cri }] = await Promise.all([
      supabase.from("portal_comunicados").select("*, criancas(nome, foto_url)").order("created_at", { ascending: false }),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    setAvisos(av || []);
    setCriancas(cri || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!criancaId || !titulo) { mostrarFeedback("erro", "Selecione a criança e preencha o título."); return; }
    setSalvando(true);
    const { error } = await supabase.from("portal_comunicados").insert({ crianca_id: criancaId, titulo, conteudo });
    setSalvando(false);
    if (error) mostrarFeedback("erro", error.message);
    else {
      mostrarFeedback("sucesso", "Aviso publicado para a família!");
      setModalAberto(false); setCriancaId(""); setTitulo(""); setConteudo("");
      carregar();
    }
  }

  async function deletar() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("portal_comunicados").delete().eq("id", deletandoId);
    setDeletandoId(null);
    setDeletandoLabel("");
    setExcluindo(false);
    mostrarFeedback("sucesso", "Aviso removido.");
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{avisos.length} aviso{avisos.length !== 1 ? "s" : ""} publicado{avisos.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
          📢 Novo aviso
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      : avisos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📢</span>
          <p className="text-slate-400 text-sm mt-3">Nenhum aviso publicado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 border-l-4 border-l-amber-400 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {a.criancas?.foto_url
                    ? <img src={a.criancas.foto_url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{a.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                  <p className="text-xs text-slate-400">{a.criancas?.nome} · {new Date(a.created_at).toLocaleDateString("pt-BR")}</p>
                  {a.conteudo && <p className="text-xs text-slate-500 mt-1 truncate">{a.conteudo}</p>}
                </div>
              </div>
              <button onClick={() => { setDeletandoId(a.id); setDeletandoLabel(a.titulo); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">🗑️</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover aviso?</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">{deletandoLabel}</p>
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
                onClick={deletar}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {excluindo ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📢 Novo Aviso para a Família</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Criança *</label>
                <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título *</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Sessão extra agendada para quinta-feira"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mensagem (opcional)</label>
                <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
                  placeholder="Detalhes do aviso..." rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={salvar} disabled={salvando || !criancaId || !titulo}
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

// =============================================
// ABA EVOLUÇÃO
// =============================================
function AbaEvolucao({ mostrarFeedback }: any) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoLabel, setDeletandoLabel] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const [{ data: evol }, { data: cri }] = await Promise.all([
      supabase.from("portal_evolucao").select("*, criancas(nome, foto_url)").order("created_at", { ascending: false }),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    setEvolucoes(evol || []);
    setCriancas(cri || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!criancaId || !titulo || !conteudo) { mostrarFeedback("erro", "Preencha todos os campos."); return; }
    setSalvando(true);
    const { error } = await supabase.from("portal_evolucao").insert({ crianca_id: criancaId, titulo, conteudo });
    setSalvando(false);
    if (error) mostrarFeedback("erro", error.message);
    else {
      mostrarFeedback("sucesso", "Evolução publicada para a família!");
      setModalAberto(false); setCriancaId(""); setTitulo(""); setConteudo("");
      carregar();
    }
  }

  async function deletar() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("portal_evolucao").delete().eq("id", deletandoId);
    setDeletandoId(null);
    setDeletandoLabel("");
    setExcluindo(false);
    mostrarFeedback("sucesso", "Registro removido.");
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{evolucoes.length} registro{evolucoes.length !== 1 ? "s" : ""} de evolução</p>
        <button onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
          📊 Novo registro
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      : evolucoes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📊</span>
          <p className="text-slate-400 text-sm mt-3">Nenhum registro de evolução ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evolucoes.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 border-l-4 border-l-blue-400 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {e.criancas?.foto_url
                    ? <img src={e.criancas.foto_url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{e.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{e.titulo}</p>
                  <p className="text-xs text-slate-400">{e.criancas?.nome} · {new Date(e.created_at).toLocaleDateString("pt-BR")}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{e.conteudo}</p>
                </div>
              </div>
              <button onClick={() => { setDeletandoId(e.id); setDeletandoLabel(e.titulo); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">🗑️</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover registro?</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">{deletandoLabel}</p>
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
                onClick={deletar}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {excluindo ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📊 Registrar Evolução</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Criança *</label>
                <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título *</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Evolução na comunicação verbal — Junho 2026"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Conteúdo *</label>
                <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
                  placeholder="Descreva a evolução observada no período..." rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={salvar} disabled={salvando || !criancaId || !titulo || !conteudo}
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