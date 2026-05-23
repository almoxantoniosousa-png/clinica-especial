"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function GestaoAgendaPage() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data } = await supabase
        .from("agenda")
        .select("*, criancas(nome)")
        .eq("data", diaSelecionado)
        .order("hora");
      setAgendamentos(data || []);
      setLoading(false);
    }
    carregar();
  }, [diaSelecionado]);

  const diasSemana = useMemo(() => {
    const dias = [];
    const hoje = new Date();
    for (let i = -1; i <= 5; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      dias.push(d.toISOString().slice(0, 10));
    }
    return dias;
  }, []);

  function nomeDia(dataStr: string) {
    return new Date(dataStr + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }

  function numeroDia(dataStr: string) {
    return new Date(dataStr + "T12:00:00").getDate();
  }

  function isHoje(dataStr: string) {
    return dataStr === new Date().toISOString().slice(0, 10);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/gestao/dashboard")}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Agenda</h1>
          <p className="text-xs text-slate-400 mt-1">Visao geral de todos os atendimentos</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {diasSemana.map(dia => (
            <button key={dia} onClick={() => setDiaSelecionado(dia)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 w-12 py-2 rounded-xl transition
                ${dia === diaSelecionado ? "bg-blue-900 text-white" : isHoje(dia) ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-500 hover:bg-slate-50"}`}>
              <span className="text-xs font-semibold uppercase">{nomeDia(dia)}</span>
              <span className="text-lg font-black">{numeroDia(dia)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2 px-1">
          {new Date(diaSelecionado + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Carregando agenda...</p>
        </div>
      ) : agendamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📅</span>
          <p className="text-sm text-slate-400">Nenhum agendamento para este dia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agendamentos.map(ag => (
            <div key={ag.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-4">
              <div className="flex-shrink-0">
                <p className="text-lg font-black text-blue-900">{ag.hora?.slice(0, 5)}</p>
              </div>
              <div className="w-px bg-slate-100"/>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{ag.criancas?.nome || "Nao identificado"}</p>
                {ag.observacao && <p className="text-xs text-slate-500 mt-1">{ag.observacao}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}