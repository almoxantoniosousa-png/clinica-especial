"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { tocarSomNotificacao } from "@/lib/somNotificacao";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  lida: boolean;
  link: string | null;
  autor_nome: string | null;
  created_at: string;
}

export function NotificacoesBell({ userRole, align = "right" }: { userRole: string; align?: "left" | "right" }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  async function carregar() {
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("destinatario_role", userRole)
      .order("created_at", { ascending: false })
      .limit(15);
    setNotificacoes(data || []);
  }

  async function marcarLida(id: string) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  }

  async function marcarTodasLidas() {
    const ids = notificacoes.filter(n => !n.lida).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from("notificacoes").update({ lida: true }).in("id", ids);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  }

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel(`notificacoes-${userRole}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notificacoes",
        filter: `destinatario_role=eq.${userRole}`,
      }, () => { tocarSomNotificacao(); carregar(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userRole]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function icone(tipo: string) {
    if (tipo === "relatorio") return "📊";
    if (tipo === "mural")    return "📢";
    if (tipo === "agenda")   return "📅";
    if (tipo === "lembrete") return "🔔";
    if (tipo === "reuniao")  return "🗒️";
    if (tipo === "ocorrencia") return "📓";
    if (tipo === "alerta")   return "⚠️";
    return "🔔";
  }

  function tempoRelativo(created_at: string) {
    const diff = Date.now() - new Date(created_at).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return "agora";
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setAberto(v => !v);
          if (!aberto) marcarTodasLidas();
        }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition"
      >
        <Bell className="w-4 h-4 text-slate-500" />
        {naoLidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className={`fixed left-3 right-3 top-16 sm:absolute sm:top-11 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden ${align === "left" ? "sm:left-0 sm:right-auto" : "sm:left-auto sm:right-0"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">Notificações</p>
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas} className="text-xs text-blue-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                <Bell className="w-8 h-8 opacity-20" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    marcarLida(n.id);
                    if (n.link) { setAberto(false); window.location.href = n.link; }
                  }}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${!n.lida ? "bg-blue-50/50" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                    {icone(n.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!n.lida ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                      {n.titulo}
                    </p>
                    {n.mensagem && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.mensagem}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {n.autor_nome && (
                        <span className="text-[10px] text-slate-400">{n.autor_nome}</span>
                      )}
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{tempoRelativo(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.lida && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
