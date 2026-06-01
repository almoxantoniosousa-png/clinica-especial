"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type Aba = "comunicados" | "momentos" | "evolucao" | "avisos";

export default function SupervisoraPage() {
  const [aba, setAba] = useState<Aba>("comunicados");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  const abas = [
    { id: "comunicados", label: "Comunicados Diários", icon: "📋" },
    { id: "momentos",    label: "Momentos",            icon: "📸" },
    { id: "evolucao",    label: "Evolução",            icon: "📊" },
    { id: "avisos",      label: "Avisos",              icon: "📢" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md bg-white p-0.5">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain"/>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
            <h1 className="text-xl md:text-2xl font-bold text-blue-900">Portal da Supervisora</h1>
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
            Comunicação com a Família
          </p>
        </div>
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
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id as Aba)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
              ${aba === a.id ? "bg-blue-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            <span>{a.icon}</span>
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {aba === "comunicados" && <AbaComunicadosDiarios mostrarFeedback={mostrarFeedback} />}
      {aba === "momentos"    && <AbaMomentos    mostrarFeedback={mostrarFeedback} />}
      {aba === "evolucao"    && <AbaEvolucao    mostrarFeedback={mostrarFeedback} />}
      {aba === "avisos"      && <AbaAvisos      mostrarFeedback={mostrarFeedback} />}
    </div>
  );
}

// =============================================
// ABA COMUNICADOS DIÁRIOS (original)
// =============================================
function AbaComunicadosDiarios({ mostrarFeedback }: any) {
  const [formularios, setFormularios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendentes" | "aprovados" | "todos">("pendentes");
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [obs, setObs] = useState("");
  const [aprovando, setAprovando] = useState(false);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("formularios_escolares")
      .select("*, criancas(nome, foto_url)")
      .order("created_at", { ascending: false });
    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    setFormularios(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function aprovar(id: string) {
    setAprovando(true);
    const { error } = await supabase.from("formularios_escolares").update({ status: "aprovado", obs_supervisora: obs }).eq("id", id);
    setAprovando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else { mostrarFeedback("sucesso", "Comunicado aprovado!"); setDetalhe(null); setObs(""); carregar(); }
  }

  const filtrados = formularios.filter(f => {
    if (filtro === "pendentes") return f.status === "aguardando";
    if (filtro === "aprovados") return f.status === "aprovado" || f.status === "enviado";
    return true;
  });

  function iniciais(nome: string) {
    return nome?.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?";
  }

  const autonomiaLabels: any = {
    1: { label: "Dependência Total", color: "bg-red-100 text-red-700" },
    2: { label: "Ajuda Física/Verbal", color: "bg-amber-100 text-amber-700" },
    3: { label: "Independência Parcial", color: "bg-blue-100 text-blue-700" },
    4: { label: "Independência Total", color: "bg-emerald-100 text-emerald-700" },
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {[{ key: "pendentes", label: "Pendentes", icon: "⏳" }, { key: "aprovados", label: "Aprovados", icon: "✅" }, { key: "todos", label: "Todos", icon: "📋" }].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filtro === f.key ? "bg-blue-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">{filtro === "pendentes" ? "🎉" : "📋"}</span>
          <p className="text-sm text-slate-400 mt-2">{filtro === "pendentes" ? "Nenhum pendente!" : "Nenhum encontrado."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(f => (
            <div key={f.id} onClick={() => { setDetalhe(f); setObs(""); }}
              className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition
                ${!f.enviado_familia ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-emerald-400"} border-slate-200`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                    {f.criancas?.foto_url
                      ? <img src={f.criancas.foto_url} alt={f.criancas.nome} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{iniciais(f.criancas?.nome)}</div>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{f.criancas?.nome}</p>
                    <p className="text-xs text-slate-400">{new Date(f.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border
                  ${f.status === "aguardando" ? "bg-amber-50 text-amber-700 border-amber-100" : f.status === "aprovado" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                  {f.status === "aguardando" ? "⏳ Aguardando" : f.status === "aprovado" ? "✓ Aprovado" : "📨 Enviado"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                  {detalhe.criancas?.foto_url
                    ? <img src={detalhe.criancas.foto_url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{detalhe.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{detalhe.criancas?.nome}</p>
                  <p className="text-xs text-slate-400">{new Date(detalhe.data + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <button onClick={() => setDetalhe(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {!detalhe.enviado_familia && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">✍️ Sua observação</p>
                  <textarea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                    placeholder="Observação opcional..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              {detalhe.status === "aguardando" ? (
                <div className="flex gap-3">
                  <button onClick={() => setDetalhe(null)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Fechar</button>
                  <button onClick={() => aprovar(detalhe.id)} disabled={aprovando}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-50">
                    {aprovando ? "Aprovando..." : "✓ Aprovar"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setDetalhe(null)} className="w-full h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Fechar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA MOMENTOS — fotos para a família
// =============================================
function AbaMomentos({ mostrarFeedback }: any) {
  const [momentos, setMomentos] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    const [{ data: mom }, { data: cri }] = await Promise.all([
      supabase.from("portal_momentos").select("*, criancas(nome, foto_url)").order("created_at", { ascending: false }),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    setMomentos(mom || []);
    setCriancas(cri || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!criancaId || !fotoFile) { mostrarFeedback("erro", "Selecione a criança e uma foto."); return; }
    setSalvando(true);

    // Upload foto
    const ext = fotoFile.name.split(".").pop();
    const path = `momentos/${criancaId}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("fotos-criancas").upload(path, fotoFile);
    if (uploadError) { mostrarFeedback("erro", "Erro no upload: " + uploadError.message); setSalvando(false); return; }
    const { data: urlData } = supabase.storage.from("fotos-criancas").getPublicUrl(path);

    const { error } = await supabase.from("portal_momentos").insert({
      crianca_id: criancaId, descricao, imagem_url: urlData.publicUrl,
    });
    setSalvando(false);
    if (error) mostrarFeedback("erro", error.message);
    else {
      mostrarFeedback("sucesso", "Momento publicado!");
      setModalAberto(false); setCriancaId(""); setDescricao(""); setFotoFile(null); setFotoPreview(null);
      carregar();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{momentos.length} momento{momentos.length !== 1 ? "s" : ""} publicado{momentos.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
          📸 Publicar momento
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      : momentos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📸</span>
          <p className="text-sm text-slate-400 mt-2">Nenhum momento publicado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {momentos.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <img src={m.imagem_url} alt="Momento" className="w-full h-48 object-cover"/>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                    {m.criancas?.foto_url
                      ? <img src={m.criancas.foto_url} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{m.criancas?.nome?.charAt(0)}</div>}
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{m.criancas?.nome}</p>
                </div>
                {m.descricao && <p className="text-xs text-slate-500">{m.descricao}</p>}
                <p className="text-xs text-slate-300 mt-1">{new Date(m.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📸 Publicar Momento</h2>
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
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foto *</label>
                <div onClick={() => inputRef.current?.click()}
                  className="w-full h-40 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 hover:bg-blue-50 transition">
                  {fotoPreview
                    ? <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover"/>
                    : <div className="text-center"><span className="text-4xl">📷</span><p className="text-xs text-slate-400 mt-2">Clique para selecionar</p></div>}
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); } }}/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição (opcional)</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Momento de recreio, trabalhando coordenação motora..." rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={salvar} disabled={salvando || !criancaId || !fotoFile}
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
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

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
      mostrarFeedback("sucesso", "Evolução publicada!");
      setModalAberto(false); setCriancaId(""); setTitulo(""); setConteudo("");
      carregar();
    }
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
          <p className="text-sm text-slate-400 mt-2">Nenhum registro de evolução ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evolucoes.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 border-l-4 border-l-blue-400">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {e.criancas?.foto_url
                    ? <img src={e.criancas.foto_url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{e.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{e.titulo}</p>
                  <p className="text-xs text-slate-400">{e.criancas?.nome} · {new Date(e.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{e.conteudo}</p>
            </div>
          ))}
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
                  placeholder="Ex: Evolução na comunicação verbal — Maio 2026"
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

// =============================================
// ABA AVISOS — comunicados gerais para família
// =============================================
function AbaAvisos({ mostrarFeedback }: any) {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

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
      mostrarFeedback("sucesso", "Aviso publicado!");
      setModalAberto(false); setCriancaId(""); setTitulo(""); setConteudo("");
      carregar();
    }
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
          <p className="text-sm text-slate-400 mt-2">Nenhum aviso publicado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 border-l-4 border-l-amber-400">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {a.criancas?.foto_url
                    ? <img src={a.criancas.foto_url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{a.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                  <p className="text-xs text-slate-400">{a.criancas?.nome} · {new Date(a.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              {a.conteudo && <p className="text-sm text-slate-600">{a.conteudo}</p>}
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📢 Novo Aviso</h2>
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