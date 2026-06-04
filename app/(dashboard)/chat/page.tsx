"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import {
  MessageCircle, Send, Paperclip, Image as ImageIcon, Check, CheckCheck,
  X, FileText, Download, Search,
} from "lucide-react";

type MensagemConteudo =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagem"; url: string; nome: string }
  | { tipo: "arquivo"; url: string; nome: string; tamanho: number };

type Mensagem = {
  id: string;
  conteudo: string;
  autor_id: string;
  created_at: string;
  lida: boolean;
};

type Conversa = {
  id: string;
  nome: string;
  tipo: string;
};

function parseConteudo(conteudo: string): MensagemConteudo {
  try {
    const parsed = JSON.parse(conteudo);
    if (parsed.tipo === "imagem" || parsed.tipo === "arquivo") return parsed;
  } catch {}
  return { tipo: "texto", texto: conteudo };
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function labelData(dateStr: string): string {
  const date = new Date(dateStr);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (date.toDateString() === hoje.toDateString()) return "Hoje";
  if (date.toDateString() === ontem.toDateString()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [perfisMap, setPerfisMap] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [digitando, setDigitando] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErro, setUploadErro] = useState<string | null>(null);
  const [naoLidasPorConversa, setNaoLidasPorConversa] = useState<Record<string, number>>({});

  const mensagensEndRef = useRef<HTMLDivElement>(null);
  const mensagensContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const digitandoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimasLeiturasRef = useRef<Record<string, string>>({});
  const isInitialLoadRef = useRef(true);

  // Carrega usuário e ultimasLeituras do localStorage
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUsuarioId(user.id);
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome")
        .eq("id", user.id)
        .single();
      if (perfil) setNomeUsuario(perfil.nome);
    };
    init();

    try {
      const stored = localStorage.getItem("chat_ultimasLeituras");
      if (stored) ultimasLeiturasRef.current = JSON.parse(stored);
    } catch {}
  }, []);

  // Carrega conversas
  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from("conversas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error("Erro ao carregar conversas:", error.message);
      if (data) setConversas(data);
    };
    carregar();
  }, []);

  // Calcula não lidas após carregar conversas + usuário
  useEffect(() => {
    if (!usuarioId || conversas.length === 0) return;
    const calcular = async () => {
      const novoMap: Record<string, number> = {};
      await Promise.all(
        conversas.map(async (c) => {
          const ultimaLeitura = ultimasLeiturasRef.current[c.id];
          let query = supabase
            .from("mensagens_chat")
            .select("id", { count: "exact", head: true })
            .eq("conversa_id", c.id)
            .neq("autor_id", usuarioId);
          if (ultimaLeitura) query = query.gt("created_at", ultimaLeitura);
          const { count } = await query;
          novoMap[c.id] = count ?? 0;
        })
      );
      setNaoLidasPorConversa(novoMap);
    };
    calcular();
  }, [conversas, usuarioId]);

  // Carrega mensagens + realtime quando muda conversa
  useEffect(() => {
    if (!conversaSelecionada) return;

    isInitialLoadRef.current = true;

    const carregarMensagens = async () => {
      const { data, error } = await supabase
        .from("mensagens_chat")
        .select("*")
        .eq("conversa_id", conversaSelecionada.id)
        .order("created_at", { ascending: true });
      if (error) console.error("Erro ao carregar mensagens:", error.message);
      if (data) {
        setMensagens(data);
        // Carrega perfis dos autores
        const ids = [...new Set(data.map((m: Mensagem) => m.autor_id))];
        if (ids.length > 0) {
          const { data: perfis } = await supabase
            .from("perfis")
            .select("id, nome")
            .in("id", ids);
          if (perfis) {
            const mapa: Record<string, string> = {};
            perfis.forEach((p: { id: string; nome: string }) => { mapa[p.id] = p.nome; });
            setPerfisMap((prev) => ({ ...prev, ...mapa }));
          }
        }
      }

      // Marca como lida
      const now = new Date().toISOString();
      ultimasLeiturasRef.current = { ...ultimasLeiturasRef.current, [conversaSelecionada.id]: now };
      try {
        localStorage.setItem("chat_ultimasLeituras", JSON.stringify(ultimasLeiturasRef.current));
      } catch {}
      setNaoLidasPorConversa((prev) => ({ ...prev, [conversaSelecionada.id]: 0 }));
    };
    carregarMensagens();

    // Desmonta canal anterior
    if (canalRef.current) {
      supabase.removeChannel(canalRef.current);
    }

    const canal = supabase
      .channel(`chat-${conversaSelecionada.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_chat",
          filter: `conversa_id=eq.${conversaSelecionada.id}`,
        },
        (payload: { new: Mensagem }) => {
          setMensagens((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // Carrega perfil do autor se novo
          const autorId = payload.new.autor_id;
          supabase
            .from("perfis")
            .select("id, nome")
            .eq("id", autorId)
            .single()
            .then((res: { data: { id: string; nome: string } | null }) => {
              if (res.data) setPerfisMap((p) => ({ ...p, [res.data!.id]: res.data!.nome }));
            });
        }
      )
      .on("broadcast", { event: "typing" }, (payload: { payload: { userId: string; nome: string } }) => {
        if (payload.payload.userId === usuarioId) return;
        setDigitando(payload.payload.nome || "Alguém");
        if (digitandoTimeoutRef.current) clearTimeout(digitandoTimeoutRef.current);
        digitandoTimeoutRef.current = setTimeout(() => setDigitando(null), 3000);
      })
      .subscribe();

    canalRef.current = canal;

    return () => {
      if (canalRef.current) {
        supabase.removeChannel(canalRef.current);
        canalRef.current = null;
      }
      setDigitando(null);
    };
  }, [conversaSelecionada]);

  // Scroll automático — instant na carga inicial, smooth em novas mensagens
  useEffect(() => {
    if (mensagens.length === 0) return;
    const container = mensagensContainerRef.current;
    if (!container) return;

    if (isInitialLoadRef.current) {
      mensagensEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      isInitialLoadRef.current = false;
      return;
    }

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    const isMyMessage = mensagens[mensagens.length - 1]?.autor_id === usuarioId;
    if (isAtBottom || isMyMessage) {
      mensagensEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

  // Broadcast "está digitando"
  const broadcastTyping = useCallback(() => {
    if (!canalRef.current || !usuarioId || !nomeUsuario) return;
    canalRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: usuarioId, nome: nomeUsuario },
    });
  }, [usuarioId, nomeUsuario]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNovaMensagem(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    broadcastTyping();
  };

  const enviarMensagem = async (conteudoOverride?: string) => {
    const texto = conteudoOverride ?? novaMensagem.trim();
    if (!texto || !conversaSelecionada || !usuarioId) return;
    if (!conteudoOverride) {
      setNovaMensagem("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    const { data, error } = await supabase
      .from("mensagens_chat")
      .insert({
        conversa_id: conversaSelecionada.id,
        autor_id: usuarioId,
        conteudo: texto,
        lida: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao enviar mensagem:", error.message);
      if (!conteudoOverride) setNovaMensagem(texto);
      return;
    }

    if (data) {
      setMensagens((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const handleFileUpload = async (file: File, tipo: "imagem" | "arquivo") => {
    if (!conversaSelecionada || !usuarioId) return;
    setUploading(true);
    setUploadErro(null);

    try {
      const ext = file.name.split(".").pop();
      const path = `${conversaSelecionada.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-uploads")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-uploads")
        .getPublicUrl(path);

      const conteudo = JSON.stringify(
        tipo === "imagem"
          ? { tipo: "imagem", url: publicUrl, nome: file.name }
          : { tipo: "arquivo", url: publicUrl, nome: file.name, tamanho: file.size }
      );

      await enviarMensagem(conteudo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar arquivo";
      setUploadErro(msg);
      setTimeout(() => setUploadErro(null), 4000);
    } finally {
      setUploading(false);
    }
  };

  // Agrupa mensagens por data
  const mensagensAgrupadas = mensagens.reduce<Array<{ label: string; itens: Mensagem[] }>>(
    (acc, msg) => {
      const label = labelData(msg.created_at);
      const grupo = acc.find((g) => g.label === label);
      if (grupo) grupo.itens.push(msg);
      else acc.push({ label, itens: [msg] });
      return acc;
    },
    []
  );

  const conversasFiltradas = conversas.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-slate-200 bg-white">

      {/* Inputs de arquivo ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "arquivo");
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "imagem");
          e.target.value = "";
        }}
      />

      {/* LISTA DE CONVERSAS */}
      <div className="w-64 border-r border-slate-200 flex flex-col shrink-0 pt-16 md:pt-0">
        <div className="p-4 border-b border-slate-200">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-blue-900 whitespace-nowrap">
            <MessageCircle className="h-5 w-5 shrink-0" />
            Mensagens
          </h1>
          <div className="mt-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-8 pr-7 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 && (
            <p className="p-4 text-sm text-slate-400">
              {busca ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda."}
            </p>
          )}
          {conversasFiltradas.map((conversa) => {
            const naoLidas = naoLidasPorConversa[conversa.id] ?? 0;
            const ativa = conversaSelecionada?.id === conversa.id;
            return (
              <button
                key={conversa.id}
                onClick={() => setConversaSelecionada(conversa)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                  ativa ? "bg-blue-50" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-sm shrink-0">
                  {conversa.nome?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className={`text-sm truncate w-full ${naoLidas > 0 && !ativa ? "font-bold text-slate-900" : "font-medium text-slate-800"}`}>
                    {conversa.nome}
                  </p>
                  <p className="text-xs text-slate-400">
                    {conversa.tipo === "grupo" ? "Grupo" : "Conversa direta"}
                  </p>
                </div>
                {naoLidas > 0 && !ativa && (
                  <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ÁREA DA CONVERSA */}
      {conversaSelecionada ? (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* CABEÇALHO */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-sm shrink-0">
              {conversaSelecionada.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {conversaSelecionada.nome}
              </p>
              <p className="text-xs min-h-4">
                {digitando ? (
                  <span className="text-blue-500 animate-pulse">{digitando} está digitando...</span>
                ) : (
                  <span className="text-slate-400">
                    {conversaSelecionada.tipo === "grupo" ? "Grupo" : "Conversa direta"}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* MENSAGENS */}
          <div ref={mensagensContainerRef} className="flex-1 overflow-y-auto p-4">
            {mensagens.length === 0 && (
              <p className="text-center text-sm text-slate-400 mt-8">
                Nenhuma mensagem ainda. Seja o primeiro a enviar!
              </p>
            )}

            {mensagensAgrupadas.map((grupo) => (
              <div key={grupo.label}>
                {/* Separador de data */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium px-2 whitespace-nowrap">
                    {grupo.label}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="space-y-2">
                  {grupo.itens.map((msg) => {
                    const isMinha = msg.autor_id === usuarioId;
                    const conteudo = parseConteudo(msg.conteudo);
                    const nomeAutor = perfisMap[msg.autor_id];

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMinha ? "items-end" : "items-start"}`}
                      >
                        {/* Nome do autor em grupos */}
                        {!isMinha && conversaSelecionada.tipo === "grupo" && nomeAutor && (
                          <span className="text-xs text-slate-500 mb-0.5 ml-1">{nomeAutor}</span>
                        )}

                        <div
                          className={`max-w-xs lg:max-w-sm rounded-2xl text-sm overflow-hidden ${
                            isMinha
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-slate-100 text-slate-800 rounded-bl-sm"
                          }`}
                        >
                          {/* Conteúdo da mensagem */}
                          {conteudo.tipo === "texto" && (
                            <p className="px-4 pt-2 pb-1 break-words whitespace-pre-wrap">
                              {conteudo.texto}
                            </p>
                          )}

                          {conteudo.tipo === "imagem" && (
                            <button
                              onClick={() => window.open(conteudo.url, "_blank")}
                              className="block w-full"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={conteudo.url}
                                alt={conteudo.nome}
                                className="max-w-full max-h-48 object-cover"
                              />
                            </button>
                          )}

                          {conteudo.tipo === "arquivo" && (
                            <a
                              href={conteudo.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-3 px-4 pt-3 pb-1 ${
                                isMinha ? "text-blue-100" : "text-slate-700"
                              }`}
                            >
                              <FileText
                                className={`h-8 w-8 shrink-0 ${
                                  isMinha ? "text-blue-200" : "text-slate-400"
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{conteudo.nome}</p>
                                <p className={`text-xs ${isMinha ? "text-blue-200" : "text-slate-400"}`}>
                                  {formatarTamanho(conteudo.tamanho)}
                                </p>
                              </div>
                              <Download className="h-4 w-4 shrink-0" />
                            </a>
                          )}

                          {/* Horário + status de leitura */}
                          <div
                            className={`flex items-center justify-end gap-1 px-3 pb-1.5 pt-0.5 ${
                              isMinha ? "text-blue-200" : "text-slate-400"
                            }`}
                          >
                            <span className="text-xs">
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMinha && (
                              msg.lida
                                ? <CheckCheck className="h-3 w-3" />
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

            {/* Indicador de digitação (bolinha animada) */}
            {digitando && (
              <div className="flex items-start mt-2">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={mensagensEndRef} />
          </div>

          {/* Erro de upload */}
          {uploadErro && (
            <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center justify-between">
              <span>{uploadErro}</span>
              <button onClick={() => setUploadErro(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* INPUT DE MENSAGEM */}
          <div className="p-3 border-t border-slate-200 flex items-end gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Enviar arquivo"
              className="text-slate-400 hover:text-slate-600 shrink-0 mb-1.5 disabled:opacity-40"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              title="Enviar imagem"
              className="text-slate-400 hover:text-slate-600 shrink-0 mb-1.5 disabled:opacity-40"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={novaMensagem}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem... (Enter envia, Shift+Enter nova linha)"
              rows={1}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden leading-5"
              style={{ minHeight: "38px", maxHeight: "120px" }}
            />
            <button
              onClick={() => enviarMensagem()}
              disabled={!novaMensagem.trim() || uploading}
              className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-0.5"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </button>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Selecione uma conversa para começar</p>
          </div>
        </div>
      )}

    </div>
  );
}
