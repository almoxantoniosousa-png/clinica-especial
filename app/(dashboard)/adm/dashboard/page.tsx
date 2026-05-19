"use client";

import { useEffect, useState } from "react";
import { carregarDadosDashboard } from "@/app/actions"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      } else {
        console.error("Não foi possível processar o diagnóstico do painel administrativo.");
      }
      setLoading(false);
    }
    
    inicializarDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Carregando diagnóstico do painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
          Dashboard Administrative
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Dados operacionais e faturamento unificado (R$ 30,00/h) atualizados automaticamente.
        </p>
      </div>

      {/* Cards executivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-100 shadow-md bg-white hover:scale-[1.02] transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center gap-3">
            <span className="p-2 bg-blue-50 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Atendimentos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-blue-900">{metricas.totalDia}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-md bg-white hover:scale-[1.02] transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center gap-3">
            <span className="p-2 bg-amber-50 rounded-xl">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Aguardando Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-orange-500">{metricas.pendentes}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-md bg-white hover:scale-[1.02] transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center gap-3">
            <span className="p-2 bg-emerald-50 rounded-xl">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Receita Acumulada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-emerald-600">
              R$ {metricas.receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha */}
        <div className="bg-white shadow-md border border-slate-100 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-700 mb-4">Receita do Mês</h2>
          <div className="h-[260px] flex items-center justify-center">
            {graficoLinha ? <Line data={graficoLinha} options={{ responsive: true, maintainAspectRatio: false }} /> : <p className="text-slate-400 text-sm">Sem dados de receita no mês.</p>}
          </div>
        </div>

        {/* Gráfico de Pizza */}
        <div className="bg-white shadow-md border border-slate-100 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-700 mb-4">Status dos Atendimentos</h2>
          <div className="h-[260px] flex items-center justify-center">
            {graficoPizza ? <Pie data={graficoPizza} options={{ responsive: true, maintainAspectRatio: false }} /> : <p className="text-slate-400 text-sm">Sem dados cadastrados.</p>}
          </div>
        </div>

        {/* Gráfico de Barras */}
        <div className="bg-white shadow-md border border-slate-100 rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-700 mb-4">Atendimentos por Semana</h2>
          <div className="h-[280px] flex items-center justify-center">
            {graficoBarras ? <Bar data={graficoBarras} options={{ responsive: true, maintainAspectRatio: false }} /> : <p className="text-slate-400 text-sm">Sem dados semanais encontrados.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}