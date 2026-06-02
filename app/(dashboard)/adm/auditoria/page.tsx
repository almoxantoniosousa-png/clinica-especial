"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

const POR_PAGINA = 20;

const ACOES_CORES: any = {
  "Criou":     "bg-emerald-100 text-emerald-700",
  "Editou":    "bg-blue-100 text-blue-700",
  "Excluiu":   "bg-red-100 text-red-700",
  "Publicou":  "bg-purple-100 text-purple-700",
  "Aprovou":   "bg-cyan-100 text-cyan-700",
  "Ativou":    "bg-emerald-100 text-emerald-700",
  "Desativou": "bg-amber-100 text-amber-700",
  "Login":     "bg-slate-100 text-slate-700",
  "Pagou":     "bg-cyan-100 text-cyan-700",
};

export default function AuditoriaPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [visiveis, setVisiveis] = useState(POR_PAGINA);
  const [mostrarResumo, setMostrarResumo] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("log_auditoria")
        .select("*")
        .order("created_at", { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    carregar();
  }, []);

  useEffect(() => { setVisiveis(POR_PAGINA); }, [busca, filtroAcao, filtroPeriodo]);

  function dentroDoperiodo(dt: string) {
    const data = new Date(dt);
    const agora = new Date();
    if (filtroPeriodo === "hoje") {
      return data.toDateString() === agora.toDateString();
    }
    if (filtroPeriodo === "semana") {
      const inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 7);
      return data >= inicio;
    }
    if (filtroPeriodo === "mes") {
      return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
    }
    return true;
  }

  const filtrados = logs.filter((l) => {
    const buscaOk = !busca ||
      l.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
      l.usuario_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      l.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      l.tabela?.toLowerCase().includes(busca.toLowerCase());
    const acaoOk = !filtroAcao || l.acao === filtroAcao;
    const periodoOk = dentroDoperiodo(l.created_at);
    return buscaOk && acaoOk && periodoOk;
  });

  const exibidos = filtrados.slice(0, visiveis);
  const temMais = visiveis < filtrados.length;
  const acoes = Array.from(new Set(logs.map(l => l.acao))).sort();

  // Resumo por usuário
  const resumoPorUsuario = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(l => {
      const key = l.usuario_email || "desconhecido";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtrados]);

  function formatarData(dt: string) {
    return new Date(dt).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function corAcao(acao: string) {
    return ACOES_CORES[acao] || "bg-slate-100 text-slate-700";
  }

  const temFiltro = busca || filtroAcao || filtroPeriodo !== "todos";

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            🔍 Log de Auditoria
          </h1>
          <p className="text-slate-300 text-sm mt-1">Histórico completo de ações no sistema</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {logs.length} registro{logs.length !== 1 ? "s" : ""} no total
            </span>
            {temFiltro && (
              <span className="bg-blue-500/30 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full">
                {filtrados.length} filtrado{filtrados.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <span className="text-5xl">📋</span>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Buscar por usuário, descrição ou tabela..." value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"/>

        <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
          <option value="">Todas as ações</option>
          {acoes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
          <option value="todos">Todo período</option>
          <option value="hoje">Hoje</option>
          <option value="semana">Última semana</option>
          <option value="mes">Este mês</option>
        </select>

        {temFiltro && (
          <button onClick={() => { setBusca(""); setFiltroAcao(""); setFiltroPeriodo("todos"); }}
            className="px-4 py-2.5 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 transition">
            Limpar
          </button>
        )}
      </div>

      {/* RESUMO POR USUÁRIO */}
      {!loading && filtrados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => setMostrarResumo(!mostrarResumo)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              👥 Resumo por usuário
            </p>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${mostrarResumo ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {mostrarResumo && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {resumoPorUsuario.map(([email, total]) => (
                <div key={email} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-600 truncate">{email}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 ml-2 flex-shrink-0">{total} ação{total !== 1 ? "ões" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LISTA */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando logs...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📋</span>
          <p className="text-slate-400 text-sm mt-3">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registros</p>
              <p className="text-xs text-slate-400">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {exibidos.map((log) => (
                <div key={log.id} className="px-5 py-3 hover:bg-slate-50 transition flex items-start gap-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 ${corAcao(log.acao)}`}>
                    {log.acao}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 font-medium">
                      {log.descricao || `${log.acao} em ${log.tabela || "sistema"}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500">
                        👤 {log.usuario_nome || log.usuario_email}
                      </span>
                      {log.tabela && (
                        <span className="text-xs text-slate-400">· {log.tabela}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">{formatarData(log.created_at)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-slate-400">Mostrando {exibidos.length} de {filtrados.length}</p>
            {temMais && (
              <button onClick={() => setVisiveis(v => v + POR_PAGINA)}
                className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Ver mais {Math.min(POR_PAGINA, filtrados.length - visiveis)} →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}