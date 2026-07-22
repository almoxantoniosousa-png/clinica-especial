"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { saudacao } from "@/components/painel-informacoes";

const ATALHOS = [
  { href: "/atendente/novo-registro",      label: "Novo Registro",     icon: "📝", cor: "bg-blue-50 text-blue-700" },
  { href: "/atendente/meus-atendimentos",  label: "Meus Atendimentos", icon: "📋", cor: "bg-emerald-50 text-emerald-700" },
  { href: "/atendente/formulario-escolar", label: "Comunicado Diário", icon: "📄", cor: "bg-amber-50 text-amber-700" },
  { href: "/atendente/meus-comunicados",   label: "Meus Comunicados",  icon: "📬", cor: "bg-purple-50 text-purple-700" },
  { href: "/atendente/escala",             label: "Minha Escala",      icon: "📅", cor: "bg-rose-50 text-rose-700" },
  { href: "/mural",                        label: "Mural",             icon: "📢", cor: "bg-sky-50 text-sky-700" },
];

export default function AtendenteDashboardPage() {
  const [nome, setNome] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user?.email) return;
      const { data } = await supabase.from("atendentes").select("nome").eq("email", user.email).maybeSingle();
      setNome(data?.nome);
    });
  }, []);

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-8 space-y-5">

      <div>
        <h1 className="text-xl font-bold text-slate-900">{saudacao(nome)}</h1>
        <p className="text-xs text-slate-400 mt-0.5 font-light tracking-wide">A Clínica Abraço te deseja um excelente trabalho</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Atalhos</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ATALHOS.map(a => (
          <Link key={a.href} href={a.href}
            className={`${a.cor} rounded-2xl p-4 flex flex-col items-start gap-2 shadow-sm hover:opacity-80 active:scale-95 transition-all`}>
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-bold leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
