"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";

export default function GestaoInternasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [colaboradoras, setColaboradoras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase.from("colaboradoras_internas").select("*").order("nome");
      setColaboradoras(data || []);
      setLoading(false);
    };
    carregar();
  }, []);

  const filtradas = colaboradoras.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.cargo.toLowerCase().includes(busca.toLowerCase())
  );

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Colaboradoras Internas</h1>
          <p className="text-slate-500 text-sm mt-1">Visualização — somente leitura</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          {colaboradoras.length} colaboradoras
        </span>
      </div>

      <input type="text" placeholder="Buscar colaboradora..." value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full sm:w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="text-4xl">🏠</span>
          <p className="text-sm mt-2">Nenhuma colaboradora encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((col) => (
            <div key={col.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  {iniciais(col.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{col.nome}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${col.cargo === "Auxiliar Administrativa" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {col.cargo}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {col.email && <span className="text-xs text-slate-500">✉️ {col.email}</span>}
                    {col.whatsapp && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">📱 {col.whatsapp}</span>}
                    {col.data_admissao && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Admissão: {new Date(col.data_admissao).toLocaleDateString("pt-BR")}</span>}
                  </div>
                  {col.endereco && <p className="text-xs text-slate-400 mt-1">📍 {col.endereco}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}