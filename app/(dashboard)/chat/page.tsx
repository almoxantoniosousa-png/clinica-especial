"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import {
  MessageCircle, Send, Paperclip, Image as ImageIcon, Images, Check, CheckCheck,
  X, FileText, Download, Search, PenSquare, Camera, ChevronLeft,
} from "lucide-react";

// ─── Permissões por role ─────────────────────────────────────────────────────

const PODE_CONTATAR: Record<string, string[]> = {
  atendente:   ["adm", "supervisora"],
  especialista:["adm", "supervisora", "gestao"],
  gestao:      ["adm", "supervisora", "especialista"],
  supervisora: ["adm", "gestao", "especialista", "atendente", "supervisora"],
  adm:         ["adm", "gestao", "especialista", "atendente", "supervisora"],
};

const ROLE_LABEL: Record<string, string> = {
  adm:         "Administrador",
  gestao:      "Gestão",
  supervisora: "Supervisora",
  especialista:"Especialista",
  atendente:   "Acompanhante",
  familia:     "Família",
};

// Cores consistentes por role para avatares
const ROLE_STYLE: Record<string, string> = {
  adm:         "bg-violet-100 text-violet-700",
  gestao:      "bg-blue-100 text-blue-700",
  supervisora: "bg-emerald-100 text-emerald-700",
  especialista:"bg-amber-100 text-amber-700",
  atendente:   "bg-slate-100 text-slate-600",
  familia:     "bg-rose-100 text-rose-700",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type MensagemConteudo =
  | { tipo: "texto";   texto: string }
  | { tipo: "imagem";  url: string; nome: string }
  | { tipo: "arquivo"; url: string; nome: string; tamanho: number };

type Mensagem = {
  id: string;
  conteudo: string;
  autor_id: string;
  created_at: string;
  lida: boolean;
};

type Perfil = { id: string; nome: string; role: string };

type Conversa = {
  id: string;
  tipo: string;
  created_at: string;
  participante_a: string;
  participante_b: string;
  perfil_a: Perfil;
  perfil_b: Perfil;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseConteudo(conteudo: string): MensagemConteudo {
  try {
    const p = JSON.parse(conteudo);
    if (p.tipo === "imagem" || p.tipo === "arquivo") return p;
  } catch {}
  return { tipo: "texto", texto: conteudo };
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function labelData(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString())  return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function outro(c: Conversa, meuId: string): Perfil {
  return c.participante_a === meuId ? c.perfil_b : c.perfil_a;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();

  // Usuário atual
  const [eu, setEu] = useState<Perfil | null>(null);

  // Lista de conversas
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [ativa, setAtiva] = useState<Conversa | null>(null);
  const [busca, setBusca] = useState("");

  // Mensagens
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [digitando, setDigitando] = useState<string | null>(null);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadErro, setUploadErro] = useState<string | null>(null);
  const [menuFoto, setMenuFoto] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Não lidas
  const [naoLidas, setNaoLidas] = useState<Record<string, number>>({});

  // Modal nova conversa
  const [modal, setModal] = useState(false);
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [criando, setCriando] = useState(false);

  // Refs
  const fimRef        = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const fileRef       = useRef<HTMLInputElement>(null);
  const imagemRef     = useRef<HTMLInputElement>(null);
  const cameraRef     = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const canalRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leiturasRef   = useRef<Record<string, string>>({});
  const primeiraVez   = useRef(true);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    try {
      const s = localStorage.getItem("chat_leituras");
      if (s) leiturasRef.current = JSON.parse(s);
    } catch {}

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("perfis").select("id, nome, role").eq("id", user.id).single();
      if (p) { setEu(p as Perfil); return; }
      // especialistas/supervisora/gestao ficam em atendentes, não em perfis
      const { data: a } = await supabase
        .from("atendentes").select("id, nome, role").eq("email", user.email).maybeSingle();
      if (a) setEu(a as Perfil);
    })();
  }, []);

  // ── Carregar conversas ────────────────────────────────────────────────────

  const carregarConversas = useCallback(async () => {
    if (!eu) return;
    const { data, error } = await supabase
      .from("conversas")
      .select(`
        id, tipo, created_at, participante_a, participante_b,
        perfil_a:perfis!participante_a(id, nome, role),
        perfil_b:perfis!participante_b(id, nome, role)
      `)
      .or(`participante_a.eq.${eu.id},participante_b.eq.${eu.id}`)
      .order("created_at", { ascending: false });
    if (error) console.error("Erro ao carregar conversas:", error.message);
    if (data) setConversas(data as unknown as Conversa[]);
  }, [eu]);

  useEffect(() => { carregarConversas(); }, [carregarConversas]);

  // ── Não lidas ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!eu || conversas.length === 0) return;
    (async () => {
      const map: Record<string, number> = {};
      await Promise.all(conversas.map(async (c) => {
        const ul = leiturasRef.current[c.id];
        let q = supabase
          .from("mensagens_chat")
          .select("id", { count: "exact", head: true })
          .eq("conversa_id", c.id)
          .neq("autor_id", eu.id);
        if (ul) q = q.gt("created_at", ul);
        const { count } = await q;
        map[c.id] = count ?? 0;
      }));
      setNaoLidas(map);
    })();
  }, [conversas, eu]);

  // ── Carregar mensagens + realtime ─────────────────────────────────────────

  useEffect(() => {
    if (!ativa || !eu) return;

    primeiraVez.current = true;
    setMensagens([]);
    setDigitando(null);

    (async () => {
      const { data, error } = await supabase
        .from("mensagens_chat").select("*")
        .eq("conversa_id", ativa.id)
        .order("created_at", { ascending: true });
      if (error) console.error("Erro ao carregar mensagens:", error.message);
      if (data) setMensagens(data);

      // marcar como lida
      const now = new Date().toISOString();
      leiturasRef.current = { ...leiturasRef.current, [ativa.id]: now };
      try { localStorage.setItem("chat_leituras", JSON.stringify(leiturasRef.current)); } catch {}
      setNaoLidas(prev => ({ ...prev, [ativa.id]: 0 }));
    })();

    if (canalRef.current) supabase.removeChannel(canalRef.current);

    const canal = supabase
      .channel(`chat-${ativa.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens_chat", filter: `conversa_id=eq.${ativa.id}` },
        (payload: { new: Mensagem }) => {
          setMensagens(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on("broadcast", { event: "typing" }, (payload: { payload: { userId: string; nome: string } }) => {
        if (payload.payload.userId === eu.id) return;
        setDigitando(payload.payload.nome);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setDigitando(null), 3000);
      })
      .subscribe();

    canalRef.current = canal;

    return () => {
      if (canalRef.current) { supabase.removeChannel(canalRef.current); canalRef.current = null; }
    };
  }, [ativa]);

  // ── Scroll automático ─────────────────────────────────────────────────────

  useEffect(() => {
    if (mensagens.length === 0) return;
    const c = containerRef.current;
    if (!c) return;
    if (primeiraVez.current) {
      fimRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      primeiraVez.current = false;
      return;
    }
    const perto = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    const minha = mensagens.at(-1)?.autor_id === eu?.id;
    if (perto || minha) fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // ── Typing broadcast ──────────────────────────────────────────────────────

  const broadcastTyping = useCallback(() => {
    if (!canalRef.current || !eu) return;
    canalRef.current.send({ type: "broadcast", event: "typing", payload: { userId: eu.id, nome: eu.nome } });
  }, [eu]);

  // ── Enviar mensagem ───────────────────────────────────────────────────────

  const enviar = async (override?: string) => {
    const conteudo = override ?? texto.trim();
    if (!conteudo || !ativa || !eu) return;
    if (!override) {
      setTexto("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    const { data, error } = await supabase
      .from("mensagens_chat")
      .insert({ conversa_id: ativa.id, autor_id: eu.id, conteudo, lida: false })
      .select().single();

    if (error) { console.error(error.message); if (!override) setTexto(conteudo); return; }
    if (data) setMensagens(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
  };

  // ── Upload de arquivo ─────────────────────────────────────────────────────

  const upload = async (file: File, tipo: "imagem" | "arquivo") => {
    if (!ativa || !eu) return;
    setUploading(true); setUploadErro(null); setMenuFoto(false);
    try {
      const ext = file.name.split(".").pop();
      const path = `${ativa.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: err } = await supabase.storage.from("chat-uploads").upload(path, file);
      if (err) throw err;
      const { data: { publicUrl } } = supabase.storage.from("chat-uploads").getPublicUrl(path);
      const conteudo = JSON.stringify(
        tipo === "imagem"
          ? { tipo: "imagem", url: publicUrl, nome: file.name }
          : { tipo: "arquivo", url: publicUrl, nome: file.name, tamanho: file.size }
      );
      await enviar(conteudo);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao enviar arquivo";
      setUploadErro(msg);
      setTimeout(() => setUploadErro(null), 5000);
    } finally { setUploading(false); }
  };

  // ── Abrir / criar conversa ────────────────────────────────────────────────

  const abrirConversa = async (alvo: Perfil) => {
    if (!eu || criando) return;

    const existente = conversas.find(c =>
      (c.participante_a === eu.id && c.participante_b === alvo.id) ||
      (c.participante_b === eu.id && c.participante_a === alvo.id)
    );
    if (existente) { setAtiva(existente); setModal(false); return; }

    setCriando(true);
    try {
      const { data, error } = await supabase
        .from("conversas")
        .insert({ nome: `${eu.nome} ↔ ${alvo.nome}`, tipo: "privado", participante_a: eu.id, participante_b: alvo.id })
        .select(`
          id, tipo, created_at, participante_a, participante_b,
          perfil_a:perfis!participante_a(id, nome, role),
          perfil_b:perfis!participante_b(id, nome, role)
        `)
        .single();
      if (error) throw error;
      const nova = data as unknown as Conversa;
      setConversas(prev => [nova, ...prev]);
      setAtiva(nova);
      setModal(false);
    } catch (e) {
      console.error("Erro ao criar conversa:", e);
    } finally { setCriando(false); }
  };

  // ── Carregar usuários para nova conversa ──────────────────────────────────

  useEffect(() => {
    if (!modal || !eu) return;
    const roles = PODE_CONTATAR[eu.role] ?? [];
    if (!roles.length) return;
    (async () => {
      // adm fica em perfis; supervisora/gestao/especialista ficam em atendentes
      const [{ data: dp }, { data: da }] = await Promise.all([
        supabase.from("perfis").select("id, nome, role").in("role", roles).neq("id", eu.id),
        supabase.from("atendentes").select("id, nome, role").in("role", roles).neq("id", eu.id),
      ]);
      const todos = [...(dp || []), ...(da || [])]
        .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      if (todos.length) setUsuarios(todos as Perfil[]);
    })();
  }, [modal, eu]);

  // ── Derivados ─────────────────────────────────────────────────────────────

  const conversasFiltradas = conversas.filter(c => {
    if (!eu) return false;
    const o = outro(c, eu.id);
    return o?.nome?.toLowerCase().includes(busca.toLowerCase());
  });

  const usuariosFiltrados = usuarios.filter(u =>
    u.nome.toLowerCase().includes(buscaUsuario.toLowerCase())
  );

  const usuariosPorRole = usuariosFiltrados.reduce<Record<string, Perfil[]>>((acc, u) => {
    if (!acc[u.role]) acc[u.role] = [];
    acc[u.role].push(u);
    return acc;
  }, {});

  const agrupado = mensagens.reduce<Array<{ label: string; itens: Mensagem[] }>>((acc, m) => {
    const l = labelData(m.created_at);
    const g = acc.find(x => x.label === l);
    if (g) g.itens.push(m); else acc.push({ label: l, itens: [m] });
    return acc;
  }, []);

  const parceiro = ativa && eu ? outro(ativa, eu.id) : null;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-slate-200 bg-white relative">

      {/* Inputs ocultos */}
      <input ref={fileRef}   type="file" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, "arquivo"); e.target.value = ""; }} />
      <input ref={imagemRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, "imagem"); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, "imagem"); e.target.value = ""; }} />

      {/* ══════════════════════════════════════════════════════
          PAINEL ESQUERDO — lista de conversas
      ══════════════════════════════════════════════════════ */}
      <div className={`
        ${ativa ? "hidden md:flex" : "flex"}
        w-full md:w-72 lg:w-80 flex-col shrink-0
        border-r border-slate-200 pt-16 md:pt-0
      `}>

        {/* Cabeçalho */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-3 bg-[#128C7E]">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-base font-semibold text-white">
              <MessageCircle className="h-5 w-5 text-white/80 shrink-0" />
              Mensagens
            </h1>
            <button
              onClick={() => { setModal(true); setBuscaUsuario(""); setUsuarios([]); }}
              title="Nova conversa"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <PenSquare className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text" placeholder="Buscar..." value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full rounded-full border-0 bg-white pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
            />
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
              <MessageCircle className="h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">
                {busca ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
              {!busca && (
                <button
                  onClick={() => { setModal(true); setBuscaUsuario(""); setUsuarios([]); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Iniciar uma conversa
                </button>
              )}
            </div>
          ) : (
            conversasFiltradas.map(c => {
              if (!eu) return null;
              const o = outro(c, eu.id);
              if (!o) return null;
              const nl = naoLidas[c.id] ?? 0;
              const isAtiva = ativa?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setAtiva(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 transition-colors ${
                    isAtiva ? "bg-[#d9fdd3]" : "hover:bg-slate-50"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${ROLE_STYLE[o.role] ?? "bg-slate-100 text-slate-600"}`}>
                    {iniciais(o.nome)}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm truncate ${nl > 0 && !isAtiva ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {o.nome}
                      </p>
                      {nl > 0 && !isAtiva && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#25D366] text-white text-xs font-bold flex items-center justify-center">
                          {nl > 99 ? "99+" : nl}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{ROLE_LABEL[o.role] ?? o.role}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAINEL DIREITO — conversa ativa
      ══════════════════════════════════════════════════════ */}
      {ativa && parceiro ? (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Cabeçalho da conversa */}
          <div className="px-4 py-3 flex items-center gap-3 shrink-0 bg-[#128C7E]">
            <button onClick={() => setAtiva(null)} className="md:hidden text-white/80 mr-1">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${ROLE_STYLE[parceiro.role] ?? "bg-slate-100 text-slate-600"}`}>
              {iniciais(parceiro.nome)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{parceiro.nome}</p>
              <p className="text-xs min-h-[1rem]">
                {digitando
                  ? <span className="text-green-200 animate-pulse">digitando...</span>
                  : <span className="text-white/70">{ROLE_LABEL[parceiro.role] ?? parceiro.role}</span>
                }
              </p>
            </div>
          </div>

          {/* Área de mensagens */}
          <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: "#e5ddd5 url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9b99a' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
            {mensagens.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 pb-8">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-bold ${ROLE_STYLE[parceiro.role] ?? "bg-slate-100 text-slate-600"}`}>
                  {iniciais(parceiro.nome)}
                </div>
                <p className="text-sm font-semibold text-slate-700">{parceiro.nome}</p>
                <p className="text-xs text-slate-400">{ROLE_LABEL[parceiro.role]}</p>
                <p className="text-xs text-slate-300 mt-2">Início da conversa · Diga olá 👋</p>
              </div>
            )}

            {agrupado.map(grupo => (
              <div key={grupo.label}>

                {/* Separador de data */}
                <div className="flex justify-center my-4">
                  <span className="text-xs text-slate-600 font-medium bg-[#e1f3fb] px-3 py-1 rounded-full shadow-sm">
                    {grupo.label}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {grupo.itens.map((msg, i) => {
                    const minha = msg.autor_id === eu?.id;
                    const c = parseConteudo(msg.conteudo);
                    const ant = grupo.itens[i - 1];
                    const primeiraDoGrupo = !ant || ant.autor_id !== msg.autor_id;

                    return (
                      <div key={msg.id} className={`flex items-end gap-1.5 ${minha ? "flex-row-reverse" : "flex-row"}`}>

                        {/* Mini-avatar do parceiro (apenas na primeira msg da sequência) */}
                        {!minha && (
                          <div className="w-6 shrink-0 self-end">
                            {primeiraDoGrupo && (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ROLE_STYLE[parceiro.role] ?? "bg-slate-100"}`}>
                                {iniciais(parceiro.nome)[0]}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Balão */}
                        <div className={`max-w-xs sm:max-w-sm lg:max-w-md rounded-2xl overflow-hidden shadow-sm text-sm ${
                          minha
                            ? "bg-[#dcf8c6] text-slate-800 rounded-br-sm"
                            : "bg-white text-slate-800 rounded-bl-sm"
                        }`}>

                          {c.tipo === "texto" && (
                            <p className="px-4 pt-2.5 pb-1 break-words whitespace-pre-wrap leading-relaxed">
                              {c.texto}
                            </p>
                          )}

                          {c.tipo === "imagem" && (
                            <button onClick={() => window.open(c.url, "_blank")} className="block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={c.url} alt={c.nome} className="max-w-full max-h-56 object-cover" />
                            </button>
                          )}

                          {c.tipo === "arquivo" && (
                            <a href={c.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-3 px-4 pt-3 pb-1 text-slate-600">
                              <FileText className="h-8 w-8 shrink-0 text-slate-400" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{c.nome}</p>
                                <p className="text-xs text-slate-400">{formatarTamanho(c.tamanho)}</p>
                              </div>
                              <Download className="h-4 w-4 shrink-0" />
                            </a>
                          )}

                          {/* Horário + status */}
                          <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 pt-0.5 text-slate-500`}>
                            <span className="text-xs">
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {minha && (msg.lida
                              ? <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                              : <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Indicador de digitação */}
            {digitando && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_STYLE[parceiro.role] ?? "bg-slate-200"}`}>
                  {iniciais(parceiro.nome)[0]}
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={fimRef} />
          </div>

          {/* Erro de upload */}
          {uploadErro && (
            <div className="mx-3 mb-1 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center justify-between shrink-0">
              <span>{uploadErro}</span>
              <button onClick={() => setUploadErro(null)}><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* Menu foto (mobile) */}
          {menuFoto && (
            <div className="mx-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden shrink-0">
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 border-b border-slate-100"
              >
                <Camera className="h-4 w-4 text-slate-500" /> Tirar foto
              </button>
              <button
                onClick={() => { imagemRef.current?.click(); setMenuFoto(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-sm text-slate-700"
              >
                <Images className="h-4 w-4 text-slate-500" /> Escolher da galeria
              </button>
            </div>
          )}

          {/* Atalhos rápidos — ADM e Gestão */}
          {(eu?.role === "adm" || eu?.role === "admin" || eu?.role === "gestao") && (
            <div className="px-3 pt-2 pb-1 flex gap-2 flex-wrap shrink-0 bg-[#f0f2f5]">
              {[
                { icon: "📍", label: "Endereço", texto: "📍 Clínica Abraço ABA\nRua Professor Leopoldo Amaral, 366 — Empresarial Alto do Parque" },
                { icon: "📱", label: "WhatsApp", texto: "📱 WhatsApp da Clínica Abraço: (71) 9 8123-6857" },
                { icon: "🗺️", label: "Maps", texto: "🗺️ Como chegar à Clínica Abraço:\nhttps://www.google.com/maps/place/12%C2%B059'58.5%22S+38%C2%B028'07.7%22W/@-12.9994182,-38.4707605,16.77z/data=!4m4!3m3!8m2!3d-12.9995756!4d-38.4688072?hl=pt-BR&entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D" },
                { icon: "📋", label: "Tudo", texto: "📍 Clínica Abraço ABA\nRua Professor Leopoldo Amaral, 366 — Empresarial Alto do Parque\n\n📱 WhatsApp: (71) 9 8123-6857\n\n🗺️ Como chegar:\nhttps://www.google.com/maps/place/12%C2%B059'58.5%22S+38%C2%B028'07.7%22W/@-12.9994182,-38.4707605,16.77z/data=!4m4!3m3!8m2!3d-12.9995756!4d-38.4688072?hl=pt-BR&entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D" },
              ].map(a => (
                <button key={a.label} onClick={() => setTexto(a.texto)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full border border-slate-200 hover:border-blue-200 transition">
                  <span>{a.icon}</span>{a.label}
                </button>
              ))}
            </div>
          )}

          {/* Barra de input */}
          <div className="p-3 flex items-end gap-2 shrink-0 bg-[#f0f2f5]">
            <button
              onClick={() => fileRef.current?.click()} disabled={uploading}
              title="Enviar arquivo"
              className="text-slate-400 hover:text-blue-500 disabled:opacity-40 transition-colors shrink-0 mb-1.5"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <button
              onClick={() => isMobile ? setMenuFoto(v => !v) : imagemRef.current?.click()}
              disabled={uploading}
              title="Enviar imagem"
              className="text-slate-400 hover:text-blue-500 disabled:opacity-40 transition-colors shrink-0 mb-1.5"
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            <textarea
              ref={textareaRef}
              value={texto}
              onChange={e => {
                setTexto(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                broadcastTyping();
              }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder="Mensagem… (Enter envia · Shift+Enter nova linha)"
              rows={1}
              className="flex-1 rounded-2xl border-0 bg-white px-4 py-2 text-sm focus:outline-none shadow-sm resize-none overflow-y-auto leading-5 transition-all"
              style={{ minHeight: "38px", maxHeight: "200px" }}
            />

            <button
              onClick={() => enviar()} disabled={!texto.trim() || uploading}
              className="w-9 h-9 bg-[#128C7E] rounded-full flex items-center justify-center hover:bg-[#0e7568] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-0.5"
            >
              {uploading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="h-4 w-4 text-white" />}
            </button>
          </div>
        </div>

      ) : (
        /* Estado vazio — desktop */
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-blue-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Selecione uma conversa</p>
            <p className="text-xs text-slate-400 mt-1">ou inicie uma nova</p>
            <button
              onClick={() => { setModal(true); setBuscaUsuario(""); setUsuarios([]); }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition-colors"
            >
              Nova conversa
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Nova conversa
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div
          className="absolute inset-0 z-30 flex items-start justify-center bg-black/25 backdrop-blur-sm p-4 pt-10"
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Nova conversa</h2>
                {eu && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Você pode contatar: {(PODE_CONTATAR[eu.role] ?? []).map(r => ROLE_LABEL[r] ?? r).join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            {/* Busca */}
            <div className="px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  autoFocus type="text" placeholder="Buscar por nome…"
                  value={buscaUsuario} onChange={e => setBuscaUsuario(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Lista de usuários agrupada por role */}
            <div className="flex-1 overflow-y-auto py-1">
              {usuarios.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 text-center px-4">
                  <p className="text-sm text-slate-400">Carregando usuários…</p>
                </div>
              )}

              {Object.entries(usuariosPorRole).map(([role, lista]) => (
                <div key={role}>
                  <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {ROLE_LABEL[role] ?? role}
                  </p>
                  {lista.map(u => {
                    const jaTem = conversas.some(c =>
                      (c.participante_a === eu?.id && c.participante_b === u.id) ||
                      (c.participante_b === eu?.id && c.participante_a === u.id)
                    );
                    return (
                      <button
                        key={u.id}
                        onClick={() => abrirConversa(u)}
                        disabled={criando}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors disabled:opacity-60"
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${ROLE_STYLE[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                          {iniciais(u.nome)}
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <p className="text-sm font-medium text-slate-800 truncate">{u.nome}</p>
                          {jaTem && <p className="text-xs text-blue-500">Conversa existente — abrir</p>}
                        </div>
                        {criando && <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}

              {usuarios.length > 0 && usuariosFiltrados.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">Nenhum resultado para "{buscaUsuario}"</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
