"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Registro = {
  id: string;
  atendente_id: string;
  atendente_nome: string;
  crianca_nome: string;
  data: string;
  horas: number;
  local: string | null;
  valor_hora: number | null;
  valor_total: number | null;
  ocorrencia: string | null;
  status: string;
};

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  pendente: { label: "Pendente", cor: "bg-amber-50 text-amber-700 border-amber-100" },
  aprovado: { label: "Aprovado", cor: "bg-blue-50 text-blue-700 border-blue-100" },
  pago:     { label: "Pago",     cor: "bg-emerald-50 text-emerald-700 border-emerald-100" },
};

function mesAtualISO() {
  return new Date().toISOString().slice(0, 7);
}

export default function AtendimentosAtsPage() {
  const supabase = createSupabaseBrowserClient();
  const [mesAno, setMesAno] = useState(mesAtualISO());
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [novoDestaque, setNovoDestaque] = useState<string | null>(null);

  useEffect(() => { carregar(); }, [mesAno]);

  useEffect(() => {
    const canal = supabase
      .channel("atendimentos-ats-adm")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atendimentos" },
        (payload: { new: any }) => {
          setNovoDestaque(payload.new.id);
          carregar();
          setTimeout(() => setNovoDestaque(null), 4000);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atendimentos" },
        () => carregar()
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    setLoading(true);
    const inicio = `${mesAno}-01`;
    const [ano, mes] = mesAno.split("-").map(Number);
    const fim = new Date(ano, mes, 0).toISOString().slice(0, 10);

    const { data } = await supabase
      .from("atendimentos")
      .select("id, atendente_id, data, horas, local, valor_hora, valor_total, ocorrencia, status, criancas(nome), atendentes(nome)")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false });

    const formatados: Registro[] = (data ?? []).map((r: any) => ({
      id: r.id,
      atendente_id: r.atendente_id,
      atendente_nome: r.atendentes?.nome || "Sem nome",
      crianca_nome: r.criancas?.nome || "Sem criança",
      data: r.data,
      horas: r.horas,
      local: r.local,
      valor_hora: r.valor_hora,
      valor_total: r.valor_total,
      ocorrencia: r.ocorrencia,
      status: r.status,
    }));

    setRegistros(formatados);
    setLoading(false);
  }

  const mesFormatado = useMemo(() => {
    const [ano, mes] = mesAno.split("-").map(Number);
    return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [mesAno]);

  function mudarMes(delta: number) {
    const [ano, mes] = mesAno.split("-").map(Number);
    const d = new Date(ano, mes - 1 + delta, 1);
    setMesAno(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const porAtendente = useMemo(() => {
    const mapa = new Map<string, Registro[]>();
    registros.forEach((r) => {
      if (!mapa.has(r.atendente_nome)) mapa.set(r.atendente_nome, []);
      mapa.get(r.atendente_nome)!.push(r);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [registros]);

  function somaValor(regs: Registro[]) {
    return regs.reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
  }
  function somaHoras(regs: Registro[]) {
    return regs.reduce((acc, r) => acc + Number(r.horas || 0), 0);
  }

  const totalHorasGeral = somaHoras(registros);
  const totalValorGeral = somaValor(registros);
  const totalAPagar = somaValor(registros.filter((r) => r.status !== "pago"));
  const totalPago = somaValor(registros.filter((r) => r.status === "pago"));

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Atendimentos dos ATs</h1>
          <p className="text-xs text-slate-400 mt-0.5">Atualiza automaticamente</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 h-10 w-full sm:w-auto">
          <button onClick={() => mudarMes(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition">‹</button>
          <span className="flex-1 sm:flex-initial sm:min-w-[140px] text-center text-sm font-semibold text-slate-700 capitalize px-2">{mesFormatado}</span>
          <button onClick={() => mudarMes(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition">›</button>
        </div>
      </div>

      {!loading && registros.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400">Total de horas</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{totalHorasGeral.toFixed(2)}h</p>
            <p className="text-[10px] text-slate-400 mt-0.5">todas as ATs</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400">Valor total</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">R$ {totalValorGeral.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">todas as ATs</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs text-amber-600">A pagar</p>
            <p className="text-xl font-black text-amber-700 mt-0.5">R$ {totalAPagar.toFixed(2)}</p>
            <p className="text-[10px] text-amber-500 mt-0.5">pendente + aprovado</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-xs text-emerald-600">Já pago</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">R$ {totalPago.toFixed(2)}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">status pago</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : porAtendente.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-slate-400 mt-2">Nenhum atendimento registrado neste mês ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {porAtendente.map(([nome, regs]) => {
            const aberto = expandido === nome;
            return (
              <div key={nome} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setExpandido(aberto ? null : nome)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition text-left">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {regs.length} atendimento{regs.length !== 1 ? "s" : ""} · {somaHoras(regs).toFixed(2)}h
                    </p>
                  </div>
                  <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    R$ {somaValor(regs).toFixed(2)}
                  </span>
                </button>
                {aberto && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {regs.map((r) => {
                      const st = STATUS_LABEL[r.status] || STATUS_LABEL.pendente;
                      const destaque = novoDestaque === r.id;
                      return (
                        <div key={r.id} className={`px-5 py-3 text-sm transition-colors ${destaque ? "bg-emerald-50" : ""}`}>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-slate-400 w-24 shrink-0">
                              {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                            <span className="font-medium text-slate-700">{r.crianca_nome}</span>
                            {r.local && <span className="text-xs text-slate-400">📍 {r.local === "escola" ? "Escola" : "Casa"}</span>}
                            <span className="text-xs text-slate-400">{Number(r.horas).toFixed(2)}h</span>
                            <span className="text-xs font-semibold text-emerald-700">R$ {Number(r.valor_total || 0).toFixed(2)}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.cor}`}>{st.label}</span>
                            {destaque && <span className="text-[10px] font-bold text-emerald-600 uppercase">Novo ✨</span>}
                          </div>
                          {r.ocorrencia && (
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{r.ocorrencia}</p>
                          )}
                        </div>
                      );
                    })}
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
