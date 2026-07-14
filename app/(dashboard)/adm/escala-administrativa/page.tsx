"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Item = {
  colaboradora_id: string;
  nome: string;
  cargo: string | null;
  dias: string[];
  horario_inicio: string;
  horario_fim: string;
};

const ORDEM_DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function EscalaAdministrativaPage() {
  const supabase = createSupabaseBrowserClient();
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("escala_administrativa")
      .select("colaboradora_id, dia, horario_inicio, horario_fim, colaboradoras_internas(nome, cargo, ativo)")
      .order("dia");

    const mapa = new Map<string, Item>();
    (data ?? []).forEach((r: any) => {
      if (!r.colaboradoras_internas?.ativo) return;
      const existente = mapa.get(r.colaboradora_id);
      if (existente && existente.horario_inicio === r.horario_inicio && existente.horario_fim === r.horario_fim) {
        existente.dias.push(r.dia);
      } else {
        mapa.set(r.colaboradora_id, {
          colaboradora_id: r.colaboradora_id,
          nome: r.colaboradoras_internas.nome,
          cargo: r.colaboradoras_internas.cargo,
          dias: [r.dia],
          horario_inicio: r.horario_inicio.slice(0, 5),
          horario_fim: r.horario_fim.slice(0, 5),
        });
      }
    });

    const lista = Array.from(mapa.values()).map((item) => ({
      ...item,
      dias: item.dias.sort((a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b)),
    }));
    lista.sort((a, b) => a.nome.localeCompare(b.nome));
    setItens(lista);
    setLoading(false);
  }

  function faixaDias(dias: string[]) {
    if (dias.length === 5 && dias[0] === "Segunda" && dias[4] === "Sexta") return "Segunda a Sexta";
    return dias.join(", ");
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Escala Administrativa</h1>
        <p className="text-xs text-slate-400 mt-0.5">Horário de trabalho de Auxiliares Administrativas e Agentes de Limpeza.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">🗓️</span>
          <p className="text-sm text-slate-400 mt-2">Nenhuma escala cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <div key={item.colaboradora_id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{item.nome}</p>
                {item.cargo && <p className="text-xs text-slate-400 mt-0.5">{item.cargo}</p>}
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                {faixaDias(item.dias)} · {item.horario_inicio}–{item.horario_fim}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
