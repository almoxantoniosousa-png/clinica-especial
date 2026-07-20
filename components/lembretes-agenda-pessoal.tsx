"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Compromisso = {
  id: string;
  data: string;
  hora: string | null;
  titulo: string;
  lembrete_minutos_antes: number | null;
};

// Data local (não UTC) — toISOString() vira o dia seguinte à noite no fuso do Brasil
// e fazia o lembrete de compromissos noturnos nunca ser encontrado.
function dataLocalISO(d: Date) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function LembretesAgendaPessoal({ email }: { email: string }) {
  const [pendentes, setPendentes] = useState<Compromisso[]>([]);
  const notificados = useRef<Set<string>>(new Set());
  const dispensando = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!email) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    async function verificar() {
      const agora = new Date();
      const hojeISO = dataLocalISO(agora);
      const limiteISO = dataLocalISO(new Date(agora.getTime() - 6 * 24 * 60 * 60 * 1000));

      const { data } = await supabase.from("agenda_pessoal")
        .select("id, data, hora, titulo, lembrete_minutos_antes")
        .eq("usuario_email", email)
        .eq("lembrete_disparado", false)
        .gte("data", limiteISO)
        .lte("data", hojeISO)
        .not("lembrete_minutos_antes", "is", null)
        .not("hora", "is", null);

      const devidos = (data || []).filter((c: Compromisso) => {
        const [h, m] = (c.hora as string).split(":").map(Number);
        const horaCompromisso = new Date(c.data + "T00:00:00");
        horaCompromisso.setHours(h, m, 0, 0);
        const disparaEm = horaCompromisso.getTime() - (c.lembrete_minutos_antes || 0) * 60000;
        return agora.getTime() >= disparaEm;
      });

      if (devidos.length === 0) return;

      setPendentes(prev => {
        const idsAtuais = new Set(prev.map(p => p.id));
        const novos = devidos.filter(d => !idsAtuais.has(d.id) && !dispensando.current.has(d.id));
        if (novos.length === 0) return prev;
        return [...prev, ...novos];
      });

      devidos.forEach((c: Compromisso) => {
        if (notificados.current.has(c.id)) return;
        notificados.current.add(c.id);
        const msg = `${c.titulo}${c.hora ? " às " + c.hora : ""}`;
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🔔 Minha Agenda", { body: msg });
        }
        // Também cai no sino de notificações (com som), pra ficar tudo num lugar só.
        supabase.from("notificacoes").insert({
          destinatario_role: "adm",
          titulo: "🔔 Minha Agenda",
          mensagem: msg,
          tipo: "lembrete",
          link: "/adm/agenda-pessoal",
        });
      });
    }

    verificar();
    const intervalo = setInterval(verificar, 60000);
    return () => clearInterval(intervalo);
  }, [email]);

  async function dispensar(id: string) {
    dispensando.current.add(id);
    setPendentes(prev => prev.filter(p => p.id !== id));
    await supabase.from("agenda_pessoal").update({ lembrete_disparado: true }).eq("id", id);
  }

  if (pendentes.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-xs space-y-2">
      {pendentes.map(c => {
        const atrasado = c.data !== dataLocalISO(new Date());
        return (
          <div key={c.id} className="bg-[#2c2a27] text-white rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-lg">🔔</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-[#c48a92] mb-0.5">
                Minha Agenda{atrasado ? " — atrasado" : ""}
              </p>
              <p className="text-sm">{c.titulo}{c.hora ? ` às ${c.hora}` : ""}</p>
            </div>
            <button onClick={() => dispensar(c.id)} className="text-white/50 hover:text-white text-sm ml-1" title="Marcar como visto">✓</button>
          </div>
        );
      })}
    </div>
  );
}
