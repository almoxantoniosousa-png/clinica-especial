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
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
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
    async function inicializarDashboard() {
      setLoading(true);
      const res = await carregarDadosDashboard();
      if (res && res.success && res.metricas) {
        setMetricas(res.metricas);
        setGraficoLinha(res.graficoLinha);
        setGraficoPizza(res.graficoPizza);
        setGraficoBarras(res.graficoBarras);
      }
      setLoading(false);
    }
    inicializarDashboard();
  }, []);

  const hoje = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Dados operacionais da Clínica Abraço atualizados automaticamente</p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 capitalize">
          📅 {hoje}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
            <span className="text-blue-600 text-base">🕐</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Atendimentos hoje</p>
          <p className="text-2xl font-bold text-blue-600">{metricas.totalDia}</p>
          <p className="text-xs text-slate-400 mt-1">registros do dia</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
            <span className="text-amber-600 text-base">⚠️</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Aguardando aprovação</p>
          <p className="text-2xl font-bold text-amber-500">{metricas.pendentes}</p>
          <p className="text-xs text-slate-400 mt-1">pagamentos pendentes</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mb-3">
            <span className="text-red-600 text-base">💸</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Despesa acumulada</p>
          <p className="text-2xl font-bold text-red-500">
            R$ {metricas.receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">mês atual</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
            <span className="text-emerald-600 text-base">✅</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total pagos</p>
          <p className="text-2xl font-bold text-emerald-600">{metricas.pagos}</p>
          <p className="text-xs text-slate-400 mt-1">atendimentos</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Despesa do mês</h2>
          <div className="h-[240px] flex items-center justify-center">
            {graficoLinha
              ? <Line data={graficoLinha} options={{ responsive: true, maintainAspectRatio: false }} />
              : <p className="text-slate-400 text-sm">Sem dados no mês.</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Status dos atendimentos</h2>
          <div className="h-[240px] flex items-center justify-center">
            {graficoPizza
              ? <Pie data={graficoPizza} options={{ responsive: true, maintainAspectRatio: false }} />
              : <p className="text-slate-400 text-sm">Sem dados cadastrados.</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Atendimentos por semana</h2>
          <div className="h-[260px] flex items-center justify-center">
            {graficoBarras
              ? <Bar data={graficoBarras} options={{ responsive: true, maintainAspectRatio: false }} />
              : <p className="text-slate-400 text-sm">Sem dados semanais.</p>}
          </div>
        </div>
      </div>

    </div>
  );
}