"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { School } from "lucide-react";

export default function GestaoEscolasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    setLoading(true);
    setErro("");
    const { data, error } = await supabase.from("escolas").select("*").order("nome");
    if (error) { setErro("Erro ao carregar as escolas: " + error.message); setLoading(false); return; }
    setEscolas(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtradas = escolas.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.coordenacao || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <School className="h-6 w-6 text-blue-600" />
            Escolas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Visualização — somente leitura</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          {escolas.length} escola{escolas.length !== 1 ? "s" : ""}
        </span>
      </div>

      <input type="text" placeholder="Buscar escola..." value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full sm:w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregar} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">
            Tentar novamente
          </button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <School className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhuma escola encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map((escola) => (
            <div key={escola.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <School className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{escola.nome}</p>
                  {escola.coordenacao && <p className="text-xs text-slate-500 mt-0.5">👤 {escola.coordenacao}</p>}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {escola.endereco && <p className="text-xs text-slate-400">📍 {escola.endereco}</p>}
                {escola.telefone && <p className="text-xs text-slate-400">📞 {escola.telefone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}