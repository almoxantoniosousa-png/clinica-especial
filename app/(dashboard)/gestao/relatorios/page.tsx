"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronUp, Filter } from "lucide-react";

export default function GestaoRelatoriosPage() {
  const router = useRouter();
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

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

    // Profissionais únicos para filtro
    const nomes = Array.from(new Set((data || []).map((r: any) => r.atendentes?.nome).filter(Boolean))).sort();
    setProfissionais(nomes as string[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = relatorios.filter(r => {
    const termoBusca = busca.toLowerCase();
    const matchBusca = !busca ||
      r.criancas?.nome?.toLowerCase().includes(termoBusca) ||
      r.atendentes?.nome?.toLowerCase().includes(termoBusca);

    const matchProfissional = !filtroProfissional || r.atendentes?.nome === filtroProfissional;

    const dataRel = r.created_at?.slice(0, 10);
    const matchInicio = !dataInicio || dataRel >= dataInicio;
    const matchFim = !dataFim || dataRel <= dataFim;

    return matchBusca && matchProfissional && matchInicio && matchFim;
  });

  const temFiltro = busca || filtroProfissional || dataInicio || dataFim;

  function limparFiltros() {
    setBusca(""); setFiltroProfissional(""); setDataInicio(""); setDataFim("");
  }

  function parseConteudo(p: any) {
    try { return JSON.parse(p.conteudo); } catch { return null; }
  }

  const campos = [
    { key: "avaliacao",   label: "Avaliação",    badge: "bg-blue-100 text-blue-700" },
    { key: "resultado",   label: "Resultados",   badge: "bg-amber-100 text-amber-700" },
    { key: "intervencao", label: "Intervenção",  badge: "bg-purple-100 text-purple-700" },
    { key: "avancos",     label: "Avanços",      badge: "bg-emerald-100 text-emerald-700" },
    { key: "conclusao",   label: "Conclusão",    badge: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Relatórios</h1>
          <p className="text-xs text-slate-400 mt-0.5">Relatórios diários da equipe</p>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Buscar por criança ou profissional..."
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button
            onClick={() => setFiltrosAbertos(v => !v)}
            className={`h-10 px-3 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition ${
              temFiltro ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Filter className="h-4 w-4" />
            Filtros
            {temFiltro && <span className="w-2 h-2 rounded-full bg-blue-500"/>}
          </button>
        </div>

        {filtrosAbertos && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Profissional</label>
              <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Todos</option>
                {profissionais.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">De</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Até</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {loading ? "Carregando..." : `${filtrados.length} de ${relatorios.length} relatório${relatorios.length !== 1 ? "s" : ""}`}
          </span>
          {temFiltro && (
            <button onClick={limparFiltros} className="text-blue-600 hover:underline">Limpar filtros</button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
          <p className="text-sm text-slate-400">Carregando relatórios...</p>
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
          <p className="text-sm text-slate-400 mt-2">
            {temFiltro ? "Nenhum relatório com esses filtros." : "Nenhum relatório encontrado."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(r => {
            const conteudo = parseConteudo(r);
            const estaAberto = aberto === r.id;
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setAberto(estaAberto ? null : r.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{r.criancas?.nome}</p>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {r.atendentes?.nome}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {estaAberto
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />}
                </button>

                {estaAberto && conteudo && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50">
                    {campos.map(campo => conteudo[campo.key] ? (
                      <div key={campo.key}>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label}</span>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{conteudo[campo.key]}</p>
                      </div>
                    ) : null)}
                    {!campos.some(c => conteudo[c.key]) && (
                      <p className="text-sm text-slate-400 italic">Conteúdo não estruturado: {r.conteudo}</p>
                    )}
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
