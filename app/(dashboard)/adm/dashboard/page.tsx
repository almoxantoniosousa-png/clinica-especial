"use client";

import { useEffect, useState, useMemo } from "react";
import { carregarDadosDashboard } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
} from "chart.js";

ChartJS.register(
  LineElement, CategoryScale, LinearScale, PointElement,
  Tooltip, Legend, ArcElement, BarElement, Filler
);

export default function AdmDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // ── estado original ──────────────────────────────────────────
  const [metricas, setMetricas] = useState({ totalDia: 0, pendentes: 0, receitaMes: 0, pagos: 0 });
  const [graficoLinha, setGraficoLinha] = useState<any>(null);
  const [graficoPizza, setGraficoPizza] = useState<any>(null);
  const [graficoBarras, setGraficoBarras] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);

  // ── estado analytics ─────────────────────────────────────────
  const [historicoFinanceiro, setHistoricoFinanceiro] = useState<any>(null);
  const [distribuicaoPlanos, setDistribuicaoPlanos] = useState<any>(null);
  const [topProfissionais, setTopProfissionais] = useState<any>(null);
  const [kpisExtra, setKpisExtra] = useState({ totalCriancas: 0, melhorProfissional: "", mediaAtend: 0 });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    async function inicializar() {
      setLoading(true);
      const res = await carregarDadosDashboard();
      if (res?.success && res.metricas) {
        setMetricas(res.metricas);
        setGraficoLinha(res.graficoLinha);
        setGraficoPizza(res.graficoPizza);
        setGraficoBarras(res.graficoBarras);
      }
      await Promise.all([carregarAniversariantes(), carregarAnalytics()]);
      setLoading(false);
    }
    inicializar();
  }, []);

  // ── aniversariantes (original) ───────────────────────────────
  async function carregarAniversariantes() {
    const mesAtual = new Date().getMonth() + 1;
    const hoje = new Date().getDate();

    const { data: atendentes } = await supabase
      .from("atendentes").select("nome, data_nascimento, role").not("data_nascimento", "is", null);
    const { data: internas } = await supabase
      .from("colaboradoras_internas").select("nome, data_nascimento, cargo").not("data_nascimento", "is", null);

    const todos = [
      ...(atendentes || []).map((a: any) => ({ ...a, tipo: a.role === "especialista" ? "Especialista" : "Acompanhante" })),
      ...(internas  || []).map((i: any) => ({ ...i, tipo: i.cargo })),
    ];

    setAniversariantes(
      todos.filter(p => new Date(p.data_nascimento).getMonth() + 1 === mesAtual)
        .map(p => { const dia = new Date(p.data_nascimento).getDate(); return { ...p, dia, diff: dia - hoje }; })
        .sort((a, b) => a.dia - b.dia)
    );
  }

  // ── analytics (novo) ─────────────────────────────────────────
  async function carregarAnalytics() {
    setLoadingAnalytics(true);
    const agora = new Date();

    // últimos 6 meses
    const meses: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const mesAtual  = meses[meses.length - 1];
    const mesInicio = meses[0];
    const [anoIni]  = mesInicio.split("-");
    const [anoFim, mesFimNum] = mesAtual.split("-");
    const ultimoDiaFim = new Date(Number(anoFim), Number(mesFimNum), 0).getDate();
    const dataIni = `${mesInicio}-01`;
    const dataFim = `${mesAtual}-${String(ultimoDiaFim).padStart(2, "0")}`;

    const [
      { data: receitaData },
      { data: despesaContasData },
      { data: despesaFolhaData },
      { data: criancasData },
      { data: atendMesData },
      { data: agendaMesData },
      { data: perfisData },
      { data: especialistasData },
    ] = await Promise.all([
      supabase.from("contas_receber").select("mes_referencia,valor_liquido,valor_total")
        .eq("status", "recebido").gte("mes_referencia", mesInicio).lte("mes_referencia", mesAtual),
      supabase.from("contas_pagar").select("vencimento,valor")
        .eq("status", "pago").gte("vencimento", dataIni).lte("vencimento", dataFim),
      supabase.from("folha_pagamento").select("mes,ano,valor_final")
        .eq("status", "pago").gte("ano", Number(anoIni)),
      supabase.from("criancas").select("plano_saude"),
      // acompanhantes: atendimentos.atendente_id → perfis.id
      supabase.from("atendimentos").select("atendente_id")
        .gte("data", `${mesAtual}-01`).lte("data", dataFim),
      // especialistas: agenda.especialista_id → atendentes.id
      supabase.from("agenda").select("especialista_id")
        .gte("data", `${mesAtual}-01`).lte("data", dataFim),
      supabase.from("perfis").select("id,nome").eq("role", "atendente"),
      supabase.from("atendentes").select("id,nome").eq("role", "especialista"),
    ]);

    // ── histórico receita vs despesa ──
    const receitaPorMes: Record<string, number> = {};
    const despesaPorMes: Record<string, number> = {};
    meses.forEach(m => { receitaPorMes[m] = 0; despesaPorMes[m] = 0; });

    (receitaData || []).forEach((r: any) => {
      if (receitaPorMes[r.mes_referencia] !== undefined)
        receitaPorMes[r.mes_referencia] += Number(r.valor_liquido ?? r.valor_total ?? 0);
    });
    (despesaContasData || []).forEach((r: any) => {
      const m = r.vencimento?.slice(0, 7);
      if (m && despesaPorMes[m] !== undefined) despesaPorMes[m] += Number(r.valor || 0);
    });
    (despesaFolhaData || []).forEach((r: any) => {
      const m = `${r.ano}-${String(r.mes).padStart(2, "0")}`;
      if (despesaPorMes[m] !== undefined) despesaPorMes[m] += Number(r.valor_final || 0);
    });

    setHistoricoFinanceiro({
      labels: meses.map(m => {
        const [a, ms] = m.split("-");
        return new Date(Number(a), Number(ms) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      }),
      datasets: [
        {
          label: "Receita",
          data: meses.map(m => receitaPorMes[m]),
          backgroundColor: "rgba(16,185,129,0.75)",
          borderColor: "rgb(16,185,129)",
          borderWidth: 1, borderRadius: 6,
        },
        {
          label: "Despesa",
          data: meses.map(m => despesaPorMes[m]),
          backgroundColor: "rgba(239,68,68,0.75)",
          borderColor: "rgb(239,68,68)",
          borderWidth: 1, borderRadius: 6,
        },
      ],
    });

    // ── planos de saúde ──
    const planosCount: Record<string, number> = {};
    (criancasData || []).forEach((c: any) => {
      const p = c.plano_saude?.trim() || "Sem plano";
      planosCount[p] = (planosCount[p] || 0) + 1;
    });
    const planosOrd = Object.entries(planosCount).sort((a, b) => b[1] - a[1]);
    const coresPlano = ["#6366f1","#10b981","#f97316","#3b82f6","#ec4899","#84cc16","#94a3b8","#f59e0b"];

    setDistribuicaoPlanos({
      labels: planosOrd.map(([p]) => p),
      datasets: [{
        data: planosOrd.map(([, n]) => n),
        backgroundColor: planosOrd.map((_, i) => coresPlano[i % coresPlano.length]),
        hoverOffset: 8, borderWidth: 2, borderColor: "#fff",
      }],
    });

    // ── top profissionais (acompanhantes + especialistas) ──
    // acompanhantes: atendimentos.atendente_id → perfis.id
    const nomesAcomp: Record<string, string> = {};
    (perfisData || []).forEach((p: any) => { nomesAcomp[p.id] = p.nome; });

    // especialistas: agenda.especialista_id → atendentes.id
    const nomesEsp: Record<string, string> = {};
    (especialistasData || []).forEach((e: any) => { nomesEsp[e.id] = e.nome; });

    const ranking: Record<string, { nome: string; role: string; count: number }> = {};

    (atendMesData || []).forEach((a: any) => {
      const id = a.atendente_id;
      if (!ranking[id]) ranking[id] = { nome: nomesAcomp[id] || "Acompanhante", role: "atendente", count: 0 };
      ranking[id].count++;
    });
    (agendaMesData || []).forEach((a: any) => {
      const id = a.especialista_id;
      if (!ranking[id]) ranking[id] = { nome: nomesEsp[id] || "Especialista", role: "especialista", count: 0 };
      ranking[id].count++;
    });

    const profOrd = Object.values(ranking)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (profOrd.length > 0) {
      setTopProfissionais({
        labels: profOrd.map(p => {
          const primeiro = p.nome.split(" ")[0];
          return p.role === "especialista" ? `${primeiro} (esp.)` : primeiro;
        }),
        datasets: [{
          label: "Atendimentos no mês",
          data: profOrd.map(p => p.count),
          backgroundColor: profOrd.map(p => p.role === "especialista" ? "#10b981" : "#6366f1"),
          borderRadius: 6,
        }],
      });
    }

    const totalAtend = (atendMesData || []).length;
    const totalCriancas = criancasData?.length || 0;

    setKpisExtra({
      totalCriancas,
      melhorProfissional: profOrd[0]?.nome.split(" ").slice(0, 2).join(" ") || "—",
      mediaAtend: totalCriancas > 0 ? Math.round((totalAtend / totalCriancas) * 10) / 10 : 0,
    });

    setLoadingAnalytics(false);
  }

  // ── opções dos gráficos ──────────────────────────────────────
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const mesNome = new Date().toLocaleDateString("pt-BR", { month: "long" });

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { size: 12 }, color: "#64748b" } },
      tooltip: { cornerRadius: 8 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#94a3b8", font: { size: 11 } } },
      y: { grid: { color: "#f1f5f9" }, ticks: { color: "#94a3b8", font: { size: 11 } } }
    }
  };

  const pieOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { font: { size: 12 }, color: "#64748b", padding: 16 } },
      tooltip: { cornerRadius: 8 }
    }
  };

  const historicoOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { size: 12 }, color: "#64748b" }, position: "top" as const },
      tooltip: {
        cornerRadius: 8,
        callbacks: { label: (ctx: any) => ` R$ ${Number(ctx.raw).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#94a3b8", font: { size: 11 } } },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#94a3b8", font: { size: 11 },
          callback: (v: any) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
        }
      }
    }
  };

  const horizontalOptions = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: { display: false },
      tooltip: { cornerRadius: 8 }
    },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { color: "#94a3b8", font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { color: "#475569", font: { size: 12 } } }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-slate-400 text-sm font-medium">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md bg-white p-0.5">
            <img src="/logo.png" alt="Logo Clínica Abraço" className="w-full h-full object-contain"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">Dashboard</h1>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
              Clínica Abraço — Visão geral operacional
            </p>
          </div>
        </div>
        <div className="self-start sm:self-auto flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span className="text-xs font-medium text-slate-600 capitalize">{hoje}</span>
        </div>
      </div>

      {/* KPIs OPERACIONAIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hoje</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-blue-600">{metricas.totalDia}</p>
          <p className="text-xs text-slate-400 mt-1">atendimentos hoje</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendentes</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-500">{metricas.pendentes}</p>
          <p className="text-xs text-slate-400 mt-1">aguardando pagamento</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-red-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custo atend.</p>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-red-500">
            R$ {metricas.receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">acumulado no mês</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagos</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-600">{metricas.pagos}</p>
          <p className="text-xs text-slate-400 mt-1">atendimentos pagos</p>
        </div>
      </div>

      {/* ANIVERSARIANTES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            🎂 Aniversariantes de {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}
          </h2>
          <span className="text-xs bg-pink-50 text-pink-600 px-2.5 py-1 rounded-full font-medium">
            {aniversariantes.length} este mês
          </span>
        </div>
        {aniversariantes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhum aniversariante este mês 🎉</p>
        ) : (
          <div className="space-y-2">
            {aniversariantes.map((p, i) => {
              const isHoje   = p.diff === 0;
              const isProximo = p.diff > 0 && p.diff <= 7;
              return (
                <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                  isHoje ? "bg-pink-50 border border-pink-200" :
                  isProximo ? "bg-amber-50 border border-amber-100" :
                  "bg-slate-50 border border-slate-100"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isHoje ? "bg-pink-200 text-pink-800" :
                      isProximo ? "bg-amber-200 text-amber-800" :
                      "bg-slate-200 text-slate-700"}`}>
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isHoje ? "text-pink-800" : "text-slate-700"}`}>
                        {p.nome} {isHoje && "🎉"}
                      </p>
                      <p className="text-xs text-slate-400">{p.tipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isHoje ? "text-pink-600" : isProximo ? "text-amber-600" : "text-slate-500"}`}>
                      dia {p.dia}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isHoje ? "Hoje! 🎂" : isProximo ? `em ${p.diff} dias` : `dia ${p.dia}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GRÁFICOS OPERACIONAIS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700">Custo de atendimentos pagos — por dia</h2>
          <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">Linha</span>
        </div>
        <div className="h-52">
          {graficoLinha
            ? <Line data={graficoLinha} options={chartOptions}/>
            : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados no mês.</p></div>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700">Atendimentos por semana</h2>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium">Barras</span>
        </div>
        <div className="h-56">
          {graficoBarras
            ? <Bar data={graficoBarras} options={chartOptions}/>
            : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados semanais.</p></div>}
        </div>
      </div>

      {/* ── DIVISOR ANALYTICS ─────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-slate-200"/>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Analytics</span>
        <div className="flex-1 h-px bg-slate-200"/>
      </div>

      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-10 gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-slate-400 text-sm">Carregando analytics...</p>
        </div>
      ) : (
        <>
          {/* KPIs ANALYTICS */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-indigo-400">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Crianças ativas</p>
              <p className="text-3xl font-black text-indigo-600">{kpisExtra.totalCriancas}</p>
              <p className="text-xs text-slate-400 mt-1">no sistema</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-violet-400">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Média atend./criança</p>
              <p className="text-3xl font-black text-violet-600">{kpisExtra.mediaAtend}</p>
              <p className="text-xs text-slate-400 mt-1">neste mês</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-fuchsia-400 col-span-2 md:col-span-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mais ativo no mês</p>
              <p className="text-lg font-black text-fuchsia-600 truncate">{kpisExtra.melhorProfissional || "—"}</p>
              <p className="text-xs text-slate-400 mt-1">profissional com mais atend.</p>
            </div>
          </div>

          {/* HISTÓRICO FINANCEIRO 6 MESES */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700">Receita vs Despesa — Últimos 6 meses</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">Financeiro</span>
            </div>
            <div className="h-64">
              {historicoFinanceiro
                ? <Bar data={historicoFinanceiro} options={historicoOptions}/>
                : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados financeiros no período.</p></div>}
            </div>
          </div>

          {/* PLANOS + TOP PROFISSIONAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">Crianças por plano de saúde</h2>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">Donut</span>
              </div>
              <div className="h-60">
                {distribuicaoPlanos
                  ? <Pie data={distribuicaoPlanos} options={pieOptions}/>
                  : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados de plano.</p></div>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">Top profissionais do mês</h2>
                <span className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium">Ranking</span>
              </div>
              <div className="h-60">
                {topProfissionais
                  ? <Bar data={topProfissionais} options={horizontalOptions}/>
                  : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem atendimentos este mês.</p></div>}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
