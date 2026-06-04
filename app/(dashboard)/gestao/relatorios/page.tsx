"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function GestaoRelatoriosPage() {
  const router = useRouter();
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");
    const { data, error } = await supabase
      .from("prontuarios")
      .select("*, criancas(nome), atendentes(nome)")
      .eq("tipo", "relatorio_diario")
      .order("created_at", { ascending: false });
    if (error) { setErro("Erro ao carregar os relatórios: " + error.message); setLoading(false); return; }
    setRelatorios(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = relatorios.filter(r =>
    r.criancas?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    r.atendentes?.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  function parseConteudo(p: any) {
    try { return JSON.parse(p.conteudo); } catch { return null; }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Relatorios</h1>
          <p className="text-xs text-slate-400 mt-1">Todos os relatorios diarios da equipe</p>
        </div>
      </div>

      <input type="text" placeholder="Buscar por crianca ou especialista..."
        value={busca} onChange={e => setBusca(e.target.value)}
        className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-400">Carregando relatorios...</p>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregar} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">
            Tentar novamente
          </button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-slate-400 mt-2">Nenhum relatorio encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(r => {
            const conteudo = parseConteudo(r);
            const estaAberto = aberto === r.id;
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setAberto(estaAberto ? null : r.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{r.criancas?.nome}</p>
                    <p className="text-xs text-slate-400">{r.atendentes?.nome} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${estaAberto ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {estaAberto && conteudo && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                    {[
                      { key: "avaliacao",   label: "Avaliacao",   badge: "bg-blue-100 text-blue-700" },
                      { key: "resultado",   label: "Resultados",  badge: "bg-amber-100 text-amber-700" },
                      { key: "intervencao", label: "Intervencao", badge: "bg-purple-100 text-purple-700" },
                      { key: "avancos",     label: "Avancos",     badge: "bg-emerald-100 text-emerald-700" },
                      { key: "conclusao",   label: "Conclusao",   badge: "bg-slate-100 text-slate-700" },
                    ].map(campo => conteudo[campo.key] ? (
                      <div key={campo.key}>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label}</span>
                        <p className="text-sm text-slate-700 mt-2">{conteudo[campo.key]}</p>
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}