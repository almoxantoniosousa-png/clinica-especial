"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

function getSegundaDaSemana(base: Date): Date {
  const d = new Date(base);
  const dia = d.getDay(); // 0=dom, 1=seg...
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

function nomeDiaCurto(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function numeroDia(dateStr: string) {
  return new Date(dateStr + "T12:00:00").getDate();
}

function mesCurto(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export default function GestaoAgendaPage() {
  const router = useRouter();
  const hoje = useMemo(() => toISO(new Date()), []);
  const [semanaBase, setSemanaBase] = useState<Date>(() => getSegundaDaSemana(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Dias da semana atual (seg-dom)
  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semanaBase);
      d.setDate(semanaBase.getDate() + i);
      return toISO(d);
    });
  }, [semanaBase]);

  // Contagem de agendamentos por dia para o badge
  const [contagemPorDia, setContagemPorDia] = useState<Record<string, number>>({});

  async function carregarSemana() {
    const inicio = diasSemana[0];
    const fim = diasSemana[6];
    const { data } = await supabase
      .from("agenda")
      .select("data")
      .gte("data", inicio)
      .lte("data", fim);
    const mapa: Record<string, number> = {};
    (data || []).forEach((a: any) => {
      mapa[a.data] = (mapa[a.data] || 0) + 1;
    });
    setContagemPorDia(mapa);
  }

  async function carregarDia() {
    setLoading(true);
    setErro("");
    const { data, error } = await supabase
      .from("agenda")
      .select("*, criancas(nome)")
      .eq("data", diaSelecionado)
      .order("hora");
    if (error) { setErro("Erro ao carregar a agenda: " + error.message); setLoading(false); return; }
    setAgendamentos(data || []);
    setLoading(false);
  }

  useEffect(() => { carregarSemana(); }, [diasSemana]);
  useEffect(() => { carregarDia(); }, [diaSelecionado]);

  function semanaAnterior() {
    const nova = new Date(semanaBase);
    nova.setDate(nova.getDate() - 7);
    setSemanaBase(nova);
    setDiaSelecionado(toISO(nova));
  }

  function proximaSemana() {
    const nova = new Date(semanaBase);
    nova.setDate(nova.getDate() + 7);
    setSemanaBase(nova);
    setDiaSelecionado(toISO(nova));
  }

  function irParaHoje() {
    const semana = getSegundaDaSemana(new Date());
    setSemanaBase(semana);
    setDiaSelecionado(hoje);
  }

  const labelSemana = useMemo(() => {
    const ini = new Date(diasSemana[0] + "T12:00:00");
    const fim = new Date(diasSemana[6] + "T12:00:00");
    const mesIni = ini.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const mesFim = fim.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const ano = fim.getFullYear();
    return mesIni === mesFim
      ? `${mesIni.charAt(0).toUpperCase() + mesIni.slice(1)} ${ano}`
      : `${mesIni.charAt(0).toUpperCase() + mesIni.slice(1)} – ${mesFim.charAt(0).toUpperCase() + mesFim.slice(1)} ${ano}`;
  }, [diasSemana]);

  const labelDiaSelecionado = new Date(diaSelecionado + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/gestao/dashboard")}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Agenda
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Visão geral de todos os atendimentos</p>
          </div>
        </div>
        {diaSelecionado !== hoje && (
          <button onClick={irParaHoje}
            className="text-xs font-semibold text-blue-600 hover:underline px-3 py-1.5 border border-blue-200 rounded-lg bg-blue-50">
            Ir para hoje
          </button>
        )}
      </div>

      {/* Navegação de semana */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={semanaAnterior}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-700">{labelSemana}</span>
          <button onClick={proximaSemana}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1">
          {diasSemana.map(dia => {
            const isHoje = dia === hoje;
            const isSelecionado = dia === diaSelecionado;
            const count = contagemPorDia[dia] || 0;
            return (
              <button key={dia} onClick={() => setDiaSelecionado(dia)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl transition
                  ${isSelecionado ? "bg-blue-900 text-white" : isHoje ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-500 hover:bg-slate-50"}`}>
                <span className="text-xs font-semibold uppercase">{nomeDiaCurto(dia)}</span>
                <span className="text-base font-black leading-none">{numeroDia(dia)}</span>
                {count > 0 && (
                  <span className={`text-xs font-bold px-1.5 rounded-full ${isSelecionado ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
                    {count}
                  </span>
                )}
                {count === 0 && <span className="h-4" />}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 px-1 capitalize">{labelDiaSelecionado}</p>
      </div>

      {/* Agendamentos do dia */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"/>
          <p className="text-sm text-slate-400">Carregando agenda...</p>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregarDia} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">
            Tentar novamente
          </button>
        </div>
      ) : agendamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📅</span>
          <p className="text-sm text-slate-400">Nenhum agendamento para este dia.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {agendamentos.length} agendamento{agendamentos.length !== 1 ? "s" : ""}
          </p>
          {agendamentos.map(ag => (
            <div key={ag.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-4 items-start">
              <div className="shrink-0 text-center min-w-[3rem]">
                <p className="text-lg font-black text-blue-900 leading-none">{ag.hora?.slice(0, 5)}</p>
                <p className="text-xs text-slate-400 mt-0.5">h</p>
              </div>
              <div className="w-px bg-slate-100 self-stretch"/>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{ag.criancas?.nome || "Não identificado"}</p>
                {ag.profissional_nome && (
                  <p className="text-xs text-slate-500 mt-0.5">👤 {ag.profissional_nome}</p>
                )}
                {ag.servico && (
                  <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{ag.servico}</span>
                )}
                {ag.observacao && (
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{ag.observacao}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
