"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GestaoCriancasPage() {
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data } = await supabase
        .from("criancas")
        .select("*")
        .order("nome");
      setCriancas(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  const filtradas = criancas.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Criancas</h1>
        <p className="text-xs text-slate-400 mt-1">Visao geral dos estudantes</p>
      </div>

      <input
        type="text"
        placeholder="Buscar crianca..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">👶</span>
          <p className="text-sm text-slate-400 mt-2">Nenhuma crianca encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 flex-shrink-0">
                  {c.nome?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-slate-400">{c.idade ? `${c.idade} anos` : ""} {c.serie ? `· Serie ${c.serie}` : ""}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                {c.diagnostico && <p>Diagnostico: <span className="text-slate-700 font-medium">{c.diagnostico}</span></p>}
                {c.modalidade && <p>Modalidade: <span className="text-slate-700 font-medium">{c.modalidade}</span></p>}
                <p>Status: <span className={`font-semibold ${c.ativo ? "text-emerald-600" : "text-red-500"}`}>{c.ativo ? "Ativo" : "Inativo"}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}