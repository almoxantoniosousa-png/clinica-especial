"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

const POR_PAGINA = 20;

const ACOES_CORES: any = {
  "Criou": "bg-emerald-100 text-emerald-700",
  "Editou": "bg-blue-100 text-blue-700",
  "Excluiu": "bg-red-100 text-red-700",
  "Publicou": "bg-purple-100 text-purple-700",
  "Login": "bg-amber-100 text-amber-700",
  "Pagou": "bg-cyan-100 text-cyan-700",
};

export default function AuditoriaPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [visiveis, setVisiveis] = useState(POR_PAGINA);

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

  useEffect(() => { setVisiveis(POR_PAGINA); }, [busca, filtroAcao]);

  const filtrados = logs.filter((l) => {
    const buscaOk = !busca ||
      l.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
      l.usuario_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      l.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      l.tabela?.toLowerCase().includes(busca.toLowerCase());
    const acaoOk = !filtroAcao || l.acao === filtroAcao;
    return buscaOk && acaoOk;
  });

  const exibidos = filtrados.slice(0, visiveis);
  const temMais = visiveis < filtrados.length;

  const acoes = Array.from(new Set(logs.map(l => l.acao))).sort();

  function formatarData(dt: string) {
    return new Date(dt).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function corAcao(acao: string) {
    return ACOES_CORES[acao] || "bg-slate-100 text-slate-700";
  }

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
              {logs.length} registro{logs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <span className="text-5xl">📋</span>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Buscar por usuário, ação ou registro..." value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"/>
        <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
          <option value="">Todas as ações</option>
          {acoes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(busca || filtroAcao) && (
          <button onClick={() => { setBusca(""); setFiltroAcao(""); }}
            className="px-4 py-2.5 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 transition">
            Limpar
          </button>
        )}
      </div>

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
                  {/* Ação badge */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 ${corAcao(log.acao)}`}>
                    {log.acao}
                  </span>

                  {/* Info */}
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

                  {/* Data */}
                  <p className="text-xs text-slate-400 flex-shrink-0">{formatarData(log.created_at)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* VER MAIS */}
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