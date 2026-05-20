"use client";

import { useEffect, useState } from "react";
import { carregarDadosDashboard } from "@/app/actions";
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
  const [metricas, setMetricas] = useState({
    totalDia: 0,
    pendentes: 0,
    receitaMes: 0,
    pagos: 0,
  });
  const [graficoLinha, setGraficoLinha] = useState<any>(null);
  const [graficoPizza, setGraficoPizza] = useState<any>(null);
  const [graficoBarras, setGraficoBarras] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
    inicializar();
  }, []);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { font: { size: 12 }, color: "#64748b", padding: 16 } },
      tooltip: { cornerRadius: 8 }
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
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
            <img src="/logo.png" alt="Logo Clínica Abraço" className="w-full h-full object-cover"/>
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

      {/* CARDS MÉTRICAS */}
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Despesa</p>
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

      {/* GRÁFICOS — linha e pizza */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">Despesa do mês</h2>
            <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">Linha</span>
          </div>
          <div className="h-52">
            {graficoLinha
              ? <Line data={graficoLinha} options={chartOptions}/>
              : <div className="h-full flex items-center justify-center">
                  <p className="text-slate-400 text-sm">Sem dados no mês.</p>
                </div>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">Status dos atendimentos</h2>
            <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-medium">Pizza</span>
          </div>
          <div className="h-52">
            {graficoPizza
              ? <Pie data={graficoPizza} options={pieOptions}/>
              : <div className="h-full flex items-center justify-center">
                  <p className="text-slate-400 text-sm">Sem dados cadastrados.</p>
                </div>}
          </div>
        </div>
      </div>

      {/* GRÁFICO BARRAS — largura total */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700">Atendimentos por semana</h2>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium">Barras</span>
        </div>
        <div className="h-56">
          {graficoBarras
            ? <Bar data={graficoBarras} options={chartOptions}/>
            : <div className="h-full flex items-center justify-center">
                <p className="text-slate-400 text-sm">Sem dados semanais.</p>
              </div>}
        </div>
      </div>

    </div>
  );
}