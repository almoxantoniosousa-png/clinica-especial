"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Registro = {
  id: string;
  especialista_nome: string | null;
  crianca: string;
  servico: string | null;
  data: string;
  horario: string | null;
  status: "P" | "F" | "FJ";
  observacao: string | null;
};

function mesAtualISO() {
  return new Date().toISOString().slice(0, 7);
}

export default function AtendimentosEspecialistasPage() {
  const supabase = createSupabaseBrowserClient();
  const [mesAno, setMesAno] = useState(mesAtualISO());
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => { carregar(); }, [mesAno]);

  async function carregar() {
    setLoading(true);
    const inicio = `${mesAno}-01`;
    const [ano, mes] = mesAno.split("-").map(Number);
    const fim = new Date(ano, mes, 0).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("atendimentos_especialista")
      .select("id, especialista_nome, crianca, servico, data, horario, status, observacao")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false });
    setRegistros(data ?? []);
    setLoading(false);
  }

  const mesFormatado = useMemo(() => {
    const [ano, mes] = mesAno.split("-").map(Number);
    return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [mesAno]);

  const porEspecialista = useMemo(() => {
    const mapa = new Map<string, Registro[]>();
    registros.forEach((r) => {
      const nome = r.especialista_nome || "Sem nome";
      if (!mapa.has(nome)) mapa.set(nome, []);
      mapa.get(nome)!.push(r);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [registros]);

  function contar(regs: Registro[], status: "P" | "F" | "FJ") {
    return regs.filter((r) => r.status === status).length;
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Atendimentos das Especialistas</h1>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{mesFormatado}</p>
        </div>
        <input type="month" value={mesAno} onChange={(e) => setMesAno(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-auto"/>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <strong>P</strong> = Presença (recebe) · <strong>F</strong> = Falta avisada em cima da hora (recebe mesmo assim) · <strong>FJ</strong> = Falta justificada com antecedência (não recebe)
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : porEspecialista.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">🩺</span>
          <p className="text-sm text-slate-400 mt-2">Nenhum registro de presença neste mês ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {porEspecialista.map(([nome, regs]) => {
            const aberto = expandido === nome;
            const p = contar(regs, "P");
            const f = contar(regs, "F");
            const fj = contar(regs, "FJ");
            return (
              <div key={nome} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setExpandido(aberto ? null : nome)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition text-left">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{regs.length} registro{regs.length !== 1 ? "s" : ""} no mês</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">P {p}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">F {f}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">FJ {fj}</span>
                  </div>
                </button>
                {aberto && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {regs.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                        <span className="text-xs text-slate-400 w-24 shrink-0">
                          {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span className="font-medium text-slate-700 flex-1 min-w-0 truncate">{r.crianca}</span>
                        <span className="text-xs text-slate-400 hidden sm:inline">{r.servico}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          r.status === "P" ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : r.status === "F" ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-red-50 text-red-700 border-red-100"}`}>
                          {r.status}
                        </span>
                        {r.observacao && (
                          <span className="text-xs text-slate-400 italic hidden md:inline truncate max-w-[200px]">"{r.observacao}"</span>
                        )}
                      </div>
                    ))}
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
