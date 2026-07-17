"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Compromisso = {
  id: string;
  hora: string | null;
  titulo: string;
  lembrete_minutos_antes: number | null;
};

export function LembretesAgendaPessoal({ email }: { email: string }) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    async function verificar() {
      const hoje = new Date();
      const dataISO = hoje.toISOString().slice(0, 10);
      const { data } = await supabase.from("agenda_pessoal")
        .select("id, hora, titulo, lembrete_minutos_antes")
        .eq("usuario_email", email)
        .eq("data", dataISO)
        .eq("lembrete_disparado", false)
        .not("lembrete_minutos_antes", "is", null)
        .not("hora", "is", null);

      (data || []).forEach((c: Compromisso) => {
        const [h, m] = (c.hora as string).split(":").map(Number);
        const horaCompromisso = new Date(hoje);
        horaCompromisso.setHours(h, m, 0, 0);
        const disparaEm = new Date(horaCompromisso.getTime() - (c.lembrete_minutos_antes || 0) * 60000);
        const agora = Date.now();
        if (agora >= disparaEm.getTime() && agora <= horaCompromisso.getTime() + 5 * 60000) {
          dispararLembrete(c);
        }
      });
    }

    async function dispararLembrete(c: Compromisso) {
      const msg = `${c.titulo}${c.hora ? " às " + c.hora : ""}`;
      setToast(msg);
      setTimeout(() => setToast(null), 8000);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("🔔 Minha Agenda", { body: msg });
      }
      await supabase.from("agenda_pessoal").update({ lembrete_disparado: true }).eq("id", c.id);
    }

    verificar();
    const intervalo = setInterval(verificar, 60000);
    return () => clearInterval(intervalo);
  }, [email]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-xs bg-[#2c2a27] text-white rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
      <span className="text-lg">🔔</span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#c48a92] mb-0.5">Minha Agenda</p>
        <p className="text-sm">{toast}</p>
      </div>
      <button onClick={() => setToast(null)} className="text-white/50 hover:text-white text-sm ml-1">✕</button>
    </div>
  );
}
