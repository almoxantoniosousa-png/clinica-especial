"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export default function GestaoMuralPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data } = await supabase
        .from("mural")
        .select("*, atendentes(nome)")
        .order("fixado", { ascending: false })
        .order("created_at", { ascending: false });
      setComunicados(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-4 pb-6 md:px-8 md:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/gestao/dashboard")}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex-shrink-0">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
            <h1 className="text-2xl font-bold text-blue-900">Mural</h1>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">Comunicados e Avisos</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-slate-400">Carregando comunicados...</p>
        </div>
      ) : comunicados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-slate-400">Nenhum comunicado publicado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comunicados.map(c => (
            <div key={c.id} className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3
              ${c.fixado ? "border-amber-200 border-l-4 border-l-amber-400" : "border-slate-200"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                {c.fixado && <span className="text-amber-500 text-sm">📌</span>}
                <h3 className="font-bold text-slate-800 text-base">{c.titulo}</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{c.conteudo}</p>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-slate-500">{c.atendentes?.nome || "Sistema"}</span>
                  {" · "}
                  {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}