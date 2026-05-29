"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";

export default function GestaoAcompanhantesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [acompanhantes, setAcompanhantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase.from("atendentes").select("*").eq("role", "atendente").order("nome");
      setAcompanhantes(data || []);
      setLoading(false);
    };
    carregar();
  }, []);

  const filtrados = acompanhantes.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.especialidade || "").toLowerCase().includes(busca.toLowerCase())
  );

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatar = [
    "bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  ];

  function corAvatar(nome: string) {
    return coresAvatar[nome.charCodeAt(0) % coresAvatar.length];
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Acompanhantes Terapêuticos</h1>
          <p className="text-slate-500 text-sm mt-1">Visualização — somente leitura</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          {acompanhantes.length} acompanhantes
        </span>
      </div>

      <input type="text" placeholder="Buscar por nome ou especialidade..." value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full sm:w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="text-4xl">👤</span>
          <p className="text-sm mt-2">Nenhum acompanhante encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((at) => (
            <div key={at.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(at.nome)}`}>
                  {iniciais(at.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{at.nome}</p>
                  <p className="text-xs text-slate-500">{at.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {at.especialidade && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{at.especialidade}</span>}
                    {at.whatsapp && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">📱 {at.whatsapp}</span>}
                    {at.data_nascimento && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Nasc: {new Date(at.data_nascimento).toLocaleDateString("pt-BR")}</span>}
                  </div>
                  {at.endereco && <p className="text-xs text-slate-400 mt-1">📍 {at.endereco}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}