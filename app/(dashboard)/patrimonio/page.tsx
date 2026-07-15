"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Bem = { id: string; numero_tombamento: number; nome: string; categoria: string; local: string | null; foto_url: string | null; status: string };

export default function PatrimonioListaPage() {
  const [bens, setBens] = useState<Bem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    supabase.from("patrimonio").select("id, numero_tombamento, nome, categoria, local, foto_url, status")
      .neq("status", "baixado").order("nome")
      .then(({ data }) => { setBens(data || []); setLoading(false); });
  }, []);

  const filtrados = useMemo(() => bens.filter(b =>
    !busca || b.nome.toLowerCase().includes(busca.toLowerCase()) || b.categoria.toLowerCase().includes(busca.toLowerCase())
  ), [bens, busca]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Patrimônio</h1>
        <p className="text-xs text-slate-400 mt-0.5">Encontrou um problema em algum equipamento? Selecione ele para reportar.</p>
      </div>

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar bem..."
        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><span className="text-5xl">📦</span><p className="text-sm text-slate-400 mt-2">Nenhum bem encontrado.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtrados.map(b => (
            <Link key={b.id} href={`/patrimonio/${b.id}/reportar-defeito`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3 hover:shadow-md hover:border-blue-200 transition">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {b.foto_url ? <img src={b.foto_url} alt="" className="w-full h-full object-cover"/> : <span className="text-xl opacity-40">📦</span>}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{b.nome}</p>
                <p className="text-xs text-slate-400">T-{b.numero_tombamento.toString().padStart(4, "0")} · {b.categoria}{b.local ? ` · ${b.local}` : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
