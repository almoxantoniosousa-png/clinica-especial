"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ProntuariosPage() {
  const router = useRouter();
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [criancaFiltro, setCriancaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from("atendentes").select("id").eq("email", user.email).maybeSingle();
      if (!perfil) return;
      const { data } = await supabase
        .from("prontuarios")
        .select("*, criancas(id, nome)")
        .eq("autor_id", perfil.id)
        .order("created_at", { ascending: false });
      setProntuarios(data || []);
      const ids = new Set((data || []).map((p: any) => p.crianca_id));
      const { data: cs } = await supabase
        .from("criancas").select("id, nome").in("id", [...ids]);
      setCriancas(cs || []);
      setLoading(false);
    }
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    return prontuarios.filter(p => {
      const matchCrianca = criancaFiltro ? p.crianca_id === criancaFiltro : true;
      const matchTipo = tipoFiltro ? p.tipo === tipoFiltro : true;
      return matchCrianca && matchTipo;
    });
  }, [prontuarios, criancaFiltro, tipoFiltro]);

  function labelTipo(tipo: string) {
    if (tipo === "relatorio_diario") return "Relatorio Diario";
    if (tipo === "sessao_dtt") return "Sessao DTT";
    return tipo;
  }

  function corTipo(tipo: string) {
    if (tipo === "relatorio_diario") return "bg-blue-100 text-blue-700";
    if (tipo === "sessao_dtt") return "bg-purple-100 text-purple-700";
    return "bg-slate-100 text-slate-600";
  }

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
          <h1 className="text-xl font-bold text-blue-900">Prontuarios</h1>
          <p className="text-xs text-slate-400">Historico de relatorios e sessoes</p>
        </div>
        <button onClick={() => router.push("/especialista/relatorio")}
          className="ml-auto h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
          + Novo Relatorio
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select value={criancaFiltro} onChange={e => setCriancaFiltro(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1">
          <option value="">Todas as criancas</option>
          {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-48">
          <option value="">Todos os tipos</option>
          <option value="relatorio_diario">Relatorio Diario</option>
          <option value="sessao_dtt">Sessao DTT</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-slate-400 font-medium">Nenhum prontuario encontrado.</p>
          <button onClick={() => router.push("/especialista/relatorio")}
            className="mt-2 h-9 px-4 bg-blue-900 text-white text-xs font-bold rounded-xl">
            Criar primeiro relatorio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(p => {
            const conteudo = parseConteudo(p);
            const estaAberto = aberto === p.id;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setAberto(estaAberto ? null : p.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${corTipo(p.tipo)}`}>
                      {labelTipo(p.tipo)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.titulo}</p>
                      <p className="text-xs text-slate-400">{p.criancas?.nome}</p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${estaAberto ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {estaAberto && conteudo && p.tipo === "sessao_dtt" && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-emerald-600">Acertos</p>
                        <p className="text-2xl font-black text-emerald-600">{conteudo.acertos}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-slate-500">Total</p>
                        <p className="text-2xl font-black text-slate-700">{conteudo.total}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-red-600">Erros</p>
                        <p className="text-2xl font-black text-red-500">{conteudo.erros}</p>
                      </div>
                    </div>
                  </div>
                )}
                {estaAberto && conteudo && p.tipo === "relatorio_diario" && (
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