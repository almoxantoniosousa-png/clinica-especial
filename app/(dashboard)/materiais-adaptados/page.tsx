"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { registrarLog } from "@/lib/auditoria";

type Material = {
  id: string;
  titulo_livro: string;
  materia?: string | null;
  serie?: string | null;
  crianca_id?: string | null;
  nivel_adaptacao?: string | null;
  observacoes?: string | null;
  fotos?: string[] | null;
  status: "rascunho" | "em_revisao" | "aprovado" | "ajustes_solicitados";
  observacao_revisao?: string | null;
  criado_por: string;
  criado_por_nome?: string | null;
  created_at: string;
  criancas?: { nome: string } | null;
};

type Aba = "acervo" | "meus" | "revisao";

const NIVEIS_ADAPTACAO = [
  "Pictogramas / CAA",
  "Leitura Fácil",
  "Texto Ampliado",
  "Resumo Simplificado",
  "Outro",
];

const STATUS_INFO: Record<string, { label: string; icon: string; cor: string }> = {
  rascunho:            { label: "Rascunho",           icon: "✏️", cor: "bg-slate-100 text-slate-600 border-slate-200" },
  em_revisao:          { label: "Em revisão",         icon: "⏳", cor: "bg-amber-50 text-amber-700 border-amber-200" },
  aprovado:            { label: "Aprovado",           icon: "✓",  cor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ajustes_solicitados: { label: "Ajustes solicitados", icon: "⚠️", cor: "bg-red-50 text-red-700 border-red-200" },
};

function CardFotos({ fotos }: { fotos?: string[] | null }) {
  if (!fotos || fotos.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {fotos.map((url, i) => (
        <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0" />
      ))}
    </div>
  );
}

export default function MateriaisAdaptadosPage() {
  const router = useRouter();

  const [aba, setAba] = useState<Aba>("acervo");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [busca, setBusca] = useState("");

  const [meuId, setMeuId] = useState<string | null>(null);
  const [meuNome, setMeuNome] = useState<string>("");
  const [meuEmail, setMeuEmail] = useState<string>("");
  const [podeRevisar, setPodeRevisar] = useState(false);

  // Modal de criação/edição
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Material | null>(null);
  const [tituloLivro, setTituloLivro] = useState("");
  const [materia, setMateria] = useState("");
  const [serie, setSerie] = useState("");
  const [criancaId, setCriancaId] = useState("");
  const [nivelAdaptacao, setNivelAdaptacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([]);
  const [fotosNovas, setFotosNovas] = useState<File[]>([]);
  const [fotosPreviews, setFotosPreviews] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Busca de pictogramas (ARASAAC)
  const [buscaPictograma, setBuscaPictograma] = useState("");
  const [resultadosPictogramas, setResultadosPictogramas] = useState<{ id: number; url: string; keyword: string }[]>([]);
  const [buscandoPictogramas, setBuscandoPictogramas] = useState(false);
  const [erroPictograma, setErroPictograma] = useState<string | null>(null);
  const [jaBuscouPictograma, setJaBuscouPictograma] = useState(false);

  // Modal de revisão
  const [revisando, setRevisando] = useState<Material | null>(null);
  const [obsRevisao, setObsRevisao] = useState("");
  const [processandoRevisao, setProcessandoRevisao] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  // ── Identidade e papel do usuário ───────────────────────────────────────
  useEffect(() => {
    async function carregarPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMeuId(user.id);
      setMeuEmail(user.email || "");

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("role, nome")
        .eq("email", user.email)
        .maybeSingle();

      if (usuario) {
        setMeuNome(usuario.nome || user.email || "");
        const role = (usuario.role || "").toLowerCase();
        setPodeRevisar(["adm", "admin", "gestao", "supervisora"].includes(role));
        return;
      }

      const { data: atendente } = await supabase
        .from("atendentes")
        .select("role, nome")
        .eq("email", user.email)
        .maybeSingle();

      if (atendente) {
        setMeuNome(atendente.nome || user.email || "");
        const role = (atendente.role || "").toLowerCase();
        setPodeRevisar(["adm", "admin", "gestao", "supervisora"].includes(role));
      } else {
        setMeuNome(user.email || "");
      }
    }
    carregarPerfil();
  }, []);

  // ── Dados ────────────────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    const [{ data: mats, error }, { data: cri }] = await Promise.all([
      supabase.from("materiais_adaptados").select("*, criancas(nome)").order("created_at", { ascending: false }),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    if (error) mostrarFeedback("erro", "Erro ao carregar materiais: " + error.message);
    setMateriais(mats || []);
    setCriancas(cri || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // ── Filtros por aba ──────────────────────────────────────────────────────
  const termoBusca = busca.trim().toLowerCase();

  const acervo = materiais.filter(m =>
    m.status === "aprovado" &&
    (!termoBusca ||
      m.titulo_livro?.toLowerCase().includes(termoBusca) ||
      m.materia?.toLowerCase().includes(termoBusca) ||
      m.serie?.toLowerCase().includes(termoBusca))
  );

  const meus = materiais.filter(m => m.criado_por === meuId);

  const emRevisao = materiais.filter(m => m.status === "em_revisao");

  // ── Formulário ───────────────────────────────────────────────────────────
  function abrirNovo() {
    setEditando(null);
    setTituloLivro(""); setMateria(""); setSerie(""); setCriancaId("");
    setNivelAdaptacao(""); setObservacoes("");
    setFotosExistentes([]); setFotosNovas([]); setFotosPreviews([]);
    setBuscaPictograma(""); setResultadosPictogramas([]);
    setErroPictograma(null); setJaBuscouPictograma(false);
    setModalAberto(true);
  }

  function abrirEdicao(m: Material) {
    setEditando(m);
    setTituloLivro(m.titulo_livro || "");
    setMateria(m.materia || "");
    setSerie(m.serie || "");
    setCriancaId(m.crianca_id || "");
    setNivelAdaptacao(m.nivel_adaptacao || "");
    setObservacoes(m.observacoes || "");
    setFotosExistentes(m.fotos || []);
    setFotosNovas([]); setFotosPreviews([]);
    setBuscaPictograma(""); setResultadosPictogramas([]);
    setErroPictograma(null); setJaBuscouPictograma(false);
    setModalAberto(true);
  }

  async function buscarPictogramas() {
    const termo = buscaPictograma.trim();
    if (!termo) return;
    setBuscandoPictogramas(true);
    setErroPictograma(null);
    try {
      const resp = await fetch(`https://api.arasaac.org/api/pictograms/pt/bestsearch/${encodeURIComponent(termo)}`);
      if (!resp.ok && resp.status !== 404) throw new Error("status " + resp.status);
      const data = resp.status === 404 ? [] : await resp.json();
      setResultadosPictogramas(
        (Array.isArray(data) ? data : []).slice(0, 12).map((p: any) => ({
          id: p._id,
          url: `https://static.arasaac.org/pictograms/${p._id}/${p._id}_300.png`,
          keyword: p.keywords?.[0]?.keyword || termo,
        }))
      );
      setJaBuscouPictograma(true);
    } catch {
      setResultadosPictogramas([]);
      setJaBuscouPictograma(true);
      setErroPictograma("Não foi possível buscar pictogramas agora (verifique a internet). Tente de novo.");
    } finally {
      setBuscandoPictogramas(false);
    }
  }

  function adicionarPictograma(url: string) {
    setFotosExistentes(prev => [...prev, url]);
  }

  function adicionarFotos(files: FileList | null) {
    if (!files) return;
    const novos = Array.from(files);
    setFotosNovas(prev => [...prev, ...novos]);
    setFotosPreviews(prev => [...prev, ...novos.map(f => URL.createObjectURL(f))]);
  }

  function removerFotoExistente(url: string) {
    setFotosExistentes(prev => prev.filter(f => f !== url));
  }

  function removerFotoNova(idx: number) {
    setFotosNovas(prev => prev.filter((_, i) => i !== idx));
    setFotosPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function salvar(novoStatus: "rascunho" | "em_revisao") {
    if (!tituloLivro.trim()) {
      mostrarFeedback("erro", "Informe o título do livro/material.");
      return;
    }
    if (!meuId) return;
    setSalvando(true);

    try {
      const urlsNovas: string[] = [];
      for (const [i, file] of fotosNovas.entries()) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${meuId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("materiais-adaptados").upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("materiais-adaptados").getPublicUrl(path);
        urlsNovas.push(publicUrl);
      }

      const fotos = [...fotosExistentes, ...urlsNovas];

      const registro = {
        titulo_livro: tituloLivro.trim(),
        materia: materia.trim() || null,
        serie: serie.trim() || null,
        crianca_id: criancaId || null,
        nivel_adaptacao: nivelAdaptacao || null,
        observacoes: observacoes.trim() || null,
        fotos,
        status: novoStatus,
        updated_at: new Date().toISOString(),
      };

      if (editando) {
        const { error } = await supabase.from("materiais_adaptados").update(registro).eq("id", editando.id);
        if (error) throw error;
        await registrarLog(supabase, {
          usuario_email: meuEmail, usuario_nome: meuNome,
          acao: novoStatus === "em_revisao" ? "Enviou para revisão" : "Atualizou material adaptado",
          tabela: "materiais_adaptados", registro_id: editando.id,
          descricao: `${tituloLivro}`,
        });
      } else {
        const { data: novo, error } = await supabase.from("materiais_adaptados").insert({
          ...registro,
          criado_por: meuId,
          criado_por_nome: meuNome,
        }).select().single();
        if (error) throw error;
        await registrarLog(supabase, {
          usuario_email: meuEmail, usuario_nome: meuNome,
          acao: novoStatus === "em_revisao" ? "Enviou para revisão" : "Criou material adaptado",
          tabela: "materiais_adaptados", registro_id: novo?.id,
          descricao: `${tituloLivro}`,
        });
      }

      mostrarFeedback("sucesso", novoStatus === "em_revisao" ? "Enviado para revisão!" : "Rascunho salvo!");
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      mostrarFeedback("erro", "Erro ao salvar: " + (e?.message || "tente novamente"));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarParaRevisao(m: Material) {
    const { error } = await supabase.from("materiais_adaptados")
      .update({ status: "em_revisao", updated_at: new Date().toISOString() })
      .eq("id", m.id);
    if (error) { mostrarFeedback("erro", error.message); return; }
    await registrarLog(supabase, {
      usuario_email: meuEmail, usuario_nome: meuNome,
      acao: "Enviou para revisão", tabela: "materiais_adaptados", registro_id: m.id,
      descricao: m.titulo_livro,
    });
    mostrarFeedback("sucesso", "Enviado para revisão!");
    carregar();
  }

  // ── Revisão (Supervisora/Gestão) ────────────────────────────────────────
  function abrirRevisao(m: Material) {
    setRevisando(m);
    setObsRevisao("");
  }

  async function aprovar() {
    if (!revisando) return;
    setProcessandoRevisao(true);
    const { error } = await supabase.from("materiais_adaptados")
      .update({ status: "aprovado", observacao_revisao: null, updated_at: new Date().toISOString() })
      .eq("id", revisando.id);
    setProcessandoRevisao(false);
    if (error) { mostrarFeedback("erro", error.message); return; }
    await registrarLog(supabase, {
      usuario_email: meuEmail, usuario_nome: meuNome,
      acao: "Aprovou material adaptado", tabela: "materiais_adaptados", registro_id: revisando.id,
      descricao: revisando.titulo_livro,
    });
    mostrarFeedback("sucesso", "Material aprovado e adicionado ao acervo!");
    setRevisando(null);
    carregar();
  }

  async function solicitarAjustes() {
    if (!revisando) return;
    if (!obsRevisao.trim()) { mostrarFeedback("erro", "Descreva o que precisa ser ajustado."); return; }
    setProcessandoRevisao(true);
    const { error } = await supabase.from("materiais_adaptados")
      .update({ status: "ajustes_solicitados", observacao_revisao: obsRevisao.trim(), updated_at: new Date().toISOString() })
      .eq("id", revisando.id);
    setProcessandoRevisao(false);
    if (error) { mostrarFeedback("erro", error.message); return; }
    await registrarLog(supabase, {
      usuario_email: meuEmail, usuario_nome: meuNome,
      acao: "Solicitou ajustes em material adaptado", tabela: "materiais_adaptados", registro_id: revisando.id,
      descricao: `${revisando.titulo_livro} — ${obsRevisao.trim()}`,
    });
    mostrarFeedback("sucesso", "Ajustes solicitados ao autor.");
    setRevisando(null);
    carregar();
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  const abas = [
    { id: "acervo", label: "Acervo", icon: "📚", count: acervo.length },
    { id: "meus",   label: "Meus Materiais", icon: "📝", count: meus.length },
    ...(podeRevisar ? [{ id: "revisao", label: "Em Revisão", icon: "⏳", count: emRevisao.length }] : []),
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Materiais Adaptados</h1>
            <p className="text-xs text-slate-400 mt-0.5">Acervo de livros e materiais adaptados</p>
          </div>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition shrink-0">
          ➕ <span className="hidden sm:inline">Novo material</span>
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto w-fit">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id as Aba)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
              ${aba === a.id ? "bg-blue-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            <span>{a.icon}</span>
            <span>{a.label}</span>
            {a.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 ${aba === a.id ? "bg-white/20" : "bg-slate-100"}`}>{a.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : (
        <>
          {/* ABA ACERVO */}
          {aba === "acervo" && (
            <div className="space-y-4">
              <input type="text" placeholder="Buscar por título, matéria ou série..."
                value={busca} onChange={e => setBusca(e.target.value)}
                className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>

              {acervo.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                  <span className="text-4xl">📚</span>
                  <p className="text-sm text-slate-400 mt-2">
                    {termoBusca ? "Nenhum material encontrado." : "Nenhum material aprovado ainda."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {acervo.map(m => (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-800 text-sm">{m.titulo_livro}</p>
                        {m.nivel_adaptacao && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium shrink-0">{m.nivel_adaptacao}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {[m.materia, m.serie].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <CardFotos fotos={m.fotos} />
                      {m.observacoes && <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{m.observacoes}</p>}
                      <p className="text-[10px] text-slate-300">por {m.criado_por_nome || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA MEUS MATERIAIS */}
          {aba === "meus" && (
            <div className="space-y-3">
              {meus.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                  <span className="text-4xl">📝</span>
                  <p className="text-sm text-slate-400 mt-2">Você ainda não cadastrou nenhum material.</p>
                </div>
              ) : (
                meus.map(m => {
                  const info = STATUS_INFO[m.status];
                  return (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{m.titulo_livro}</p>
                          <p className="text-xs text-slate-400">{[m.materia, m.serie].filter(Boolean).join(" · ") || "—"}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${info.cor}`}>
                          {info.icon} {info.label}
                        </span>
                      </div>
                      <CardFotos fotos={m.fotos} />
                      {m.observacoes && <p className="text-sm text-slate-600 leading-relaxed">{m.observacoes}</p>}
                      {m.status === "ajustes_solicitados" && m.observacao_revisao && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                          <p className="text-xs font-bold text-red-600">Ajustes solicitados:</p>
                          <p className="text-sm text-red-700 mt-0.5">{m.observacao_revisao}</p>
                        </div>
                      )}
                      {(m.status === "rascunho" || m.status === "ajustes_solicitados") && (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => abrirEdicao(m)}
                            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                            ✏️ Editar
                          </button>
                          <button onClick={() => enviarParaRevisao(m)}
                            className="flex-1 h-10 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition">
                            📤 Enviar para revisão
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ABA EM REVISÃO */}
          {aba === "revisao" && podeRevisar && (
            <div className="space-y-3">
              {emRevisao.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                  <span className="text-4xl">🎉</span>
                  <p className="text-sm text-slate-400 mt-2">Nenhum material aguardando revisão.</p>
                </div>
              ) : (
                emRevisao.map(m => (
                  <div key={m.id} onClick={() => abrirRevisao(m)}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-2 cursor-pointer hover:shadow-md transition border-l-4 border-l-amber-400">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{m.titulo_livro}</p>
                        <p className="text-xs text-slate-400">{[m.materia, m.serie].filter(Boolean).join(" · ") || "—"} · por {m.criado_por_nome || "—"}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 shrink-0">⏳ Em revisão</span>
                    </div>
                    <CardFotos fotos={m.fotos} />
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL CRIAR/EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-900 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">{editando ? "Editar material" : "Novo material adaptado"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título do livro/material *</label>
                <input type="text" value={tituloLivro} onChange={e => setTituloLivro(e.target.value)}
                  placeholder="Ex: Histórias em Quadrinhos — Cap. 3"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Matéria</label>
                  <input type="text" value={materia} onChange={e => setMateria(e.target.value)}
                    placeholder="Ex: Português"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Série/Ano</label>
                  <input type="text" value={serie} onChange={e => setSerie(e.target.value)}
                    placeholder="Ex: 4º ano"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Criança (opcional)</label>
                <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Material geral do acervo</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nível de adaptação</label>
                <select value={nivelAdaptacao} onChange={e => setNivelAdaptacao(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {NIVEIS_ADAPTACAO.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
                  placeholder="Descreva a adaptação feita, particularidades da criança, etc."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">🔎 Buscar pictogramas (ARASAAC)</label>
                <div className="flex gap-2">
                  <input type="text" value={buscaPictograma}
                    onChange={e => setBuscaPictograma(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); buscarPictogramas(); } }}
                    placeholder="Ex: escola, comer, feliz..."
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <button type="button" onClick={buscarPictogramas} disabled={buscandoPictogramas || !buscaPictograma.trim()}
                    className="h-11 px-4 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-50 shrink-0">
                    {buscandoPictogramas ? "Buscando..." : "Buscar"}
                  </button>
                </div>
                {buscandoPictogramas && (
                  <p className="text-xs text-slate-400 mt-2">🔄 Buscando pictogramas...</p>
                )}
                {erroPictograma && !buscandoPictogramas && (
                  <p className="text-xs text-red-600 mt-2">⚠️ {erroPictograma}</p>
                )}
                {!buscandoPictogramas && !erroPictograma && jaBuscouPictograma && resultadosPictogramas.length === 0 && (
                  <p className="text-xs text-slate-400 mt-2">Nenhum pictograma encontrado para "{buscaPictograma.trim()}".</p>
                )}
                {resultadosPictogramas.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                    {resultadosPictogramas.map(p => (
                      <button key={p.id} type="button" onClick={() => adicionarPictograma(p.url)} title={`Adicionar "${p.keyword}"`}
                        className="aspect-square bg-white border border-slate-200 rounded-lg p-1 hover:border-blue-400 hover:shadow-sm transition">
                        <img src={p.url} alt={p.keyword} className="w-full h-full object-contain"/>
                      </button>
                    ))}
                  </div>
                )}
                {!jaBuscouPictograma && !buscandoPictogramas && (
                  <p className="text-[10px] text-slate-400 mt-1">Pictogramas: ARASAAC (arasaac.org) · Governo de Aragão, licença CC BY-NC-SA</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fotos do material</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {fotosExistentes.map(url => (
                    <div key={url} className="relative w-20 h-20 shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200"/>
                      <button onClick={() => removerFotoExistente(url)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow">✕</button>
                    </div>
                  ))}
                  {fotosPreviews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200"/>
                      <button onClick={() => removerFotoNova(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => cameraRef.current?.click()}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-1.5">
                    📷 Tirar foto
                  </button>
                  <button onClick={() => galeriaRef.current?.click()}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-1.5">
                    🖼️ Galeria
                  </button>
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { adicionarFotos(e.target.files); e.target.value = ""; }}/>
                <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { adicionarFotos(e.target.files); e.target.value = ""; }}/>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-white flex gap-3">
              <button onClick={() => salvar("rascunho")} disabled={salvando}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                {salvando ? "Salvando..." : "💾 Salvar rascunho"}
              </button>
              <button onClick={() => salvar("em_revisao")} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
                {salvando ? "Enviando..." : "📤 Enviar para revisão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVISÃO */}
      {revisando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setRevisando(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-900 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">Revisar material</h2>
              <button onClick={() => setRevisando(null)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3 bg-slate-50">
              <div>
                <p className="font-semibold text-slate-800">{revisando.titulo_livro}</p>
                <p className="text-xs text-slate-400">{[revisando.materia, revisando.serie].filter(Boolean).join(" · ") || "—"} · por {revisando.criado_por_nome || "—"}</p>
              </div>
              {revisando.nivel_adaptacao && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">{revisando.nivel_adaptacao}</span>
              )}
              {revisando.criancas?.nome && (
                <p className="text-sm text-slate-600">👶 Material para: <strong>{revisando.criancas.nome}</strong></p>
              )}
              <CardFotos fotos={revisando.fotos} />
              {revisando.observacoes && (
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Observações</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{revisando.observacoes}</p>
                </div>
              )}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
                  <p className="text-xs font-bold text-amber-700 uppercase">Solicitar ajustes (opcional)</p>
                </div>
                <textarea rows={3} value={obsRevisao} onChange={e => setObsRevisao(e.target.value)}
                  placeholder="Descreva o que precisa ser ajustado..."
                  className="w-full px-4 py-3 text-sm focus:outline-none resize-none"/>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-white flex gap-3">
              <button onClick={solicitarAjustes} disabled={processandoRevisao}
                className="flex-1 h-11 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition disabled:opacity-50">
                {processandoRevisao ? "Enviando..." : "⚠️ Solicitar ajustes"}
              </button>
              <button onClick={aprovar} disabled={processandoRevisao}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                {processandoRevisao ? "Enviando..." : "✓ Aprovar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
