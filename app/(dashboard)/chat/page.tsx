"use client";

import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { MessageCircle, Send, Paperclip, Image, Check, CheckCheck } from "lucide-react";

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

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  // Guarda última mensagem vista por conversa para indicar "não lidas"
  const [ultimasLidas, setUltimasLidas] = useState<Record<string, number>>({});
  const mensagensEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carregarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUsuarioId(user.id);
    };
    carregarUsuario();
  }, []);

  useEffect(() => {
    const carregarConversas = async () => {
      const { data, error } = await supabase
        .from("conversas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error("Erro ao carregar conversas:", error.message);
      if (data) setConversas(data);
    };
    carregarConversas();
  }, []);

  useEffect(() => {
    if (!conversaSelecionada) return;

    const carregarMensagens = async () => {
      const { data, error } = await supabase
        .from("mensagens_chat")
        .select("*")
        .eq("conversa_id", conversaSelecionada.id)
        .order("created_at", { ascending: true });
      if (error) console.error("Erro ao carregar mensagens:", error.message);
      if (data) {
        setMensagens(data);
        // Marca quantas mensagens já foram vistas nessa conversa
        setUltimasLidas((prev) => ({
          ...prev,
          [conversaSelecionada.id]: data.length,
        }));
      }
    };
    carregarMensagens();

    // Realtime — escuta novas mensagens de OUTROS usuários
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
            // Evita duplicar mensagem já adicionada via insert local
            const jaExiste = prev.some((m) => m.id === payload.new.id);
            if (jaExiste) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [conversaSelecionada]);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || !usuarioId) return;

    const textoEnviar = novaMensagem.trim();
    setNovaMensagem(""); // Limpa imediatamente para boa UX

    const { data, error } = await supabase
      .from("mensagens_chat")
      .insert({
        conversa_id: conversaSelecionada.id,
        autor_id: usuarioId,
        conteudo: textoEnviar,
        lida: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao enviar mensagem:", error.message);
      setNovaMensagem(textoEnviar); // Devolve o texto se falhou
      return;
    }

    // ✅ Adiciona a mensagem enviada localmente (sem esperar o Realtime)
    if (data) {
      setMensagens((prev) => {
        const jaExiste = prev.some((m) => m.id === data.id);
        if (jaExiste) return prev;
        return [...prev, data];
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  // Conta mensagens não lidas por conversa (recebidas de outros)
  const contarNaoLidas = (conversaId: string) => {
    if (conversaSelecionada?.id === conversaId) return 0;
    const vistas = ultimasLidas[conversaId] ?? 0;
    const totalDaConversa = mensagens.filter(
      (m) => m.autor_id !== usuarioId
    ).length;
    return Math.max(0, totalDaConversa - vistas);
  };

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-slate-200 bg-white">

      {/* LISTA DE CONVERSAS */}
      <div className="w-64 border-r border-slate-200 flex flex-col shrink-0 pt-16 md:pt-0">
        <div className="p-4 border-b border-slate-200">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-blue-900 whitespace-nowrap">
            <MessageCircle className="h-5 w-5 shrink-0" />
            Mensagens
          </h1>
          <input
            type="text"
            placeholder="Buscar..."
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversas.length === 0 && (
            <p className="p-4 text-sm text-slate-400">Nenhuma conversa ainda.</p>
          )}
          {conversas.map((conversa) => {
            const naoLidas = contarNaoLidas(conversa.id);
            return (
              <button
                key={conversa.id}
                onClick={() => setConversaSelecionada(conversa)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                  conversaSelecionada?.id === conversa.id ? "bg-blue-50" : ""
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-sm shrink-0">
                  {conversa.nome?.charAt(0).toUpperCase()}
                </div>

                {/* Nome + tipo — FIX: overflow-hidden no container */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-800 truncate w-full">
                    {conversa.nome}
                  </p>
                  <p className="text-xs text-slate-400">
                    {conversa.tipo === "grupo" ? "Grupo" : "Conversa direta"}
                  </p>
                </div>

                {/* Badge de não lidas */}
                {naoLidas > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                    {naoLidas}
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
              <p className="text-sm font-semibold text-slate-800 truncate">{conversaSelecionada.nome}</p>
              <p className="text-xs text-slate-400">
                {conversaSelecionada.tipo === "grupo" ? "Grupo" : "Conversa direta"}
              </p>
            </div>
          </div>

          {/* MENSAGENS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensagens.length === 0 && (
              <p className="text-center text-sm text-slate-400 mt-8">
                Nenhuma mensagem ainda. Seja o primeiro a enviar!
              </p>
            )}
            {mensagens.map((msg) => {
              const isMinha = msg.autor_id === usuarioId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMinha ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                      isMinha
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    <p className="break-words">{msg.conteudo}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMinha ? "text-blue-200" : "text-slate-400"}`}>
                      <span className="text-xs">
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {/* ✅ Indicador de leitura — apenas nas minhas mensagens */}
                      {isMinha && (
                        msg.lida
                          ? <CheckCheck className="h-3 w-3 text-blue-200" />  /* lida — duplo azul */
                          : <Check className="h-3 w-3 text-blue-300" />        /* enviada — simples */
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={mensagensEndRef} />
          </div>

          {/* INPUT DE MENSAGEM */}
          <div className="p-3 border-t border-slate-200 flex items-center gap-2 shrink-0">
            <button className="text-slate-400 hover:text-slate-600 shrink-0">
              <Paperclip className="h-5 w-5" />
            </button>
            <button className="text-slate-400 hover:text-slate-600 shrink-0">
              <Image className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={enviarMensagem}
              disabled={!novaMensagem.trim()}
              className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4 w-4 text-white" />
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