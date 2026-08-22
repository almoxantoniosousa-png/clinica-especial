"use client";

import { useEffect, useState, useMemo } from "react";
import { carregarDadosDashboard, carregarGraficosPorMes } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { PainelInformacoes } from "@/components/painel-informacoes";
import { primeiroNome, hojeLocal, dataComemorativaHoje, proximasDatasComemorativas } from "@/lib/dataUtils";
import { Pie, Bar } from "react-chartjs-2";
import type { ChartData, ScriptableContext } from "chart.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";

type Aniversariante = { nome: string; data_nascimento: string; tipo: string; dia: number; diff: number; foto_url?: string | null };

// Degradê azul da marca (mesmo tom do menu/cabeçalhos) em vez de azul chapado nos gráficos
function gradienteAzulMarca(context: ScriptableContext<"bar">) {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return "#1d4ed8";
  const gradiente = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradiente.addColorStop(0, "#1d4ed8");
  gradiente.addColorStop(1, "#3b82f6");
  return gradiente;
}

ChartJS.register(CategoryScale, LinearScale, Tooltip, Legend, ArcElement, BarElement);

export default function AdmDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // ── estado original ──────────────────────────────────────────
  const [metricas, setMetricas] = useState({ totalDia: 0, pendentes: 0, receitaMes: 0, pagos: 0 });
  const [graficoPizza, setGraficoPizza] = useState<ChartData<"pie"> | null>(null);
  const [graficoBarras, setGraficoBarras] = useState<ChartData<"bar"> | null>(null);
  const [mesAtualReal, setMesAtualReal] = useState("");
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [mesAtualLabel, setMesAtualLabel] = useState("");
  const [carregandoGraficos, setCarregandoGraficos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
  const [aniversariantesAbertos, setAniversariantesAbertos] = useState(true);

  // ── estado analytics ─────────────────────────────────────────
  const [historicoFinanceiro, setHistoricoFinanceiro] = useState<ChartData<"bar"> | null>(null);
  const [distribuicaoPlanos, setDistribuicaoPlanos] = useState<ChartData<"pie"> | null>(null);
  const [topProfissionais, setTopProfissionais] = useState<ChartData<"bar"> | null>(null);
  const [kpisExtra, setKpisExtra] = useState({ totalCriancas: 0, melhorProfissional: "", mediaAtend: 0 });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // ── contagens de equipe/recursos (cards do painel operacional) ─
  const [contagens, setContagens] = useState({ acompanhantes: 0, especialistas: 0, criancas: 0, escolas: 0 });

  // ── datas comemorativas (só o ADM vê) ──────────────────────────
  const hoje = useMemo(() => hojeLocal(), []);
  const dataComemorativa = useMemo(() => dataComemorativaHoje(hoje), [hoje]);
  const proximasDatas = useMemo(() => proximasDatasComemorativas(hoje, 3), [hoje]);

  async function carregarContagens() {
    const [{ count: acompanhantes }, { count: especialistas }, { count: criancas }, { count: escolas }] = await Promise.all([
      supabase.from("atendentes").select("id", { count: "exact", head: true }).eq("role", "atendente").is("data_demissao", null),
      supabase.from("atendentes").select("id", { count: "exact", head: true }).eq("role", "especialista").is("data_demissao", null),
      supabase.from("criancas").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("escolas").select("id", { count: "exact", head: true }),
    ]);
    setContagens({ acompanhantes: acompanhantes || 0, especialistas: especialistas || 0, criancas: criancas || 0, escolas: escolas || 0 });
  }


  useEffect(() => {
    async function inicializar() {
      setLoading(true);
      const res = await carregarDadosDashboard();
      if (res?.success && res.metricas) {
        setMetricas(res.metricas);
        setGraficoPizza(res.graficoPizza);
        setGraficoBarras(res.graficoBarras ? {
          ...res.graficoBarras,
          datasets: res.graficoBarras.datasets.map((d) =>
            d.label === "AT" ? { ...d, backgroundColor: gradienteAzulMarca } : d
          ),
        } : null);
        setMesAtualLabel(res.mesAtualLabel || "");
        setMesAtualReal(res.mesAtual || "");
        setMesSelecionado(res.mesAtual || "");
      }
      await Promise.all([carregarAniversariantes(), carregarAnalytics(), carregarContagens()]);
      setLoading(false);
    }
    inicializar();
  }, []);

  // ── navegação de mês do gráfico "Atendimentos por semana" ────
  async function carregarMes(novoMes: string) {
    if (novoMes > mesAtualReal) return;
    setCarregandoGraficos(true);
    const res = await carregarGraficosPorMes(novoMes);
    if (res?.success && res.graficoBarras) {
      setGraficoBarras({
        ...res.graficoBarras,
        datasets: res.graficoBarras.datasets.map((d) =>
          d.label === "AT" ? { ...d, backgroundColor: gradienteAzulMarca } : d
        ),
      });
      setMesAtualLabel(res.mesAtualLabel || "");
      setMesSelecionado(novoMes);
    }
    setCarregandoGraficos(false);
  }

  function mudarMes(delta: number) {
    if (!mesSelecionado) return;
    const [ano, mes] = mesSelecionado.split("-").map(Number);
    const d = new Date(ano, mes - 1 + delta, 1);
    carregarMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // ── aniversariantes (original) ───────────────────────────────
  async function carregarAniversariantes() {
    const mesAtual = new Date().getMonth() + 1;
    const hoje = new Date().getDate();

    const { data: atendentes } = await supabase
      .from("atendentes").select("nome, data_nascimento, role, logo_url").not("data_nascimento", "is", null);
    const { data: internas } = await supabase
      .from("colaboradoras_internas").select("nome, data_nascimento, cargo, foto_url").not("data_nascimento", "is", null);
    const { data: criancas } = await supabase
      .from("criancas").select("nome, data_nascimento, foto_url").eq("ativo", true).not("data_nascimento", "is", null);

    const todos = [
      ...(atendentes || []).map((a: { nome: string; data_nascimento: string; role: string; logo_url?: string | null }) => ({ ...a, tipo: a.role === "especialista" ? "Especialista" : "Acompanhante", foto_url: a.logo_url })),
      ...(internas  || []).map((i: { nome: string; data_nascimento: string; cargo: string; foto_url?: string | null }) => ({ ...i, tipo: i.cargo })),
      ...(criancas  || []).map((c: { nome: string; data_nascimento: string; foto_url?: string | null }) => ({ ...c, tipo: "Criança" })),
    ];

    // data_nascimento vem como "AAAA-MM-DD" — usar new Date(...).getDate() aqui
    // converte pro fuso local e, no Brasil, joga o dia pra véspera (ex: dia 15
    // virava 14). Pega o mês/dia direto da string, sem passar por Date.
    setAniversariantes(
      todos.filter(p => Number(p.data_nascimento.slice(5, 7)) === mesAtual)
        .map(p => { const dia = Number(p.data_nascimento.slice(8, 10)); return { ...p, dia, diff: dia - hoje }; })
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
      { data: acompanhantesData },
      { data: especialistasData },
    ] = await Promise.all([
      supabase.from("contas_receber").select("mes_referencia,valor_liquido,valor_total")
        .eq("status", "recebido").gte("mes_referencia", mesInicio).lte("mes_referencia", mesAtual),
      supabase.from("contas_pagar").select("vencimento,valor")
        .eq("status", "pago").gte("vencimento", dataIni).lte("vencimento", dataFim),
      supabase.from("folha_pagamento").select("mes,ano,valor_final")
        .eq("status", "pago").gte("ano", Number(anoIni)),
      supabase.from("criancas").select("plano_saude"),
      // acompanhantes: atendimentos.atendente_id → atendentes.id
      supabase.from("atendimentos").select("atendente_id")
        .gte("data", `${mesAtual}-01`).lte("data", dataFim),
      // especialistas: agenda.especialista_id → atendentes.id
      supabase.from("agenda").select("especialista_id")
        .gte("data", `${mesAtual}-01`).lte("data", dataFim),
      supabase.from("atendentes").select("id,nome").eq("role", "atendente"),
      supabase.from("atendentes").select("id,nome").eq("role", "especialista"),
    ]);

    // ── histórico receita vs despesa ──
    const receitaPorMes: Record<string, number> = {};
    const despesaPorMes: Record<string, number> = {};
    meses.forEach(m => { receitaPorMes[m] = 0; despesaPorMes[m] = 0; });

    (receitaData || []).forEach((r: { mes_referencia: string; valor_liquido?: number; valor_total?: number }) => {
      if (receitaPorMes[r.mes_referencia] !== undefined)
        receitaPorMes[r.mes_referencia] += Number(r.valor_liquido ?? r.valor_total ?? 0);
    });
    (despesaContasData || []).forEach((r: { vencimento: string; valor: number }) => {
      const m = r.vencimento?.slice(0, 7);
      if (m && despesaPorMes[m] !== undefined) despesaPorMes[m] += Number(r.valor || 0);
    });
    (despesaFolhaData || []).forEach((r: { mes: number; ano: number; valor_final: number }) => {
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
          backgroundColor: "rgba(15,148,136,0.75)",
          borderColor: "rgb(15,148,136)",
          borderWidth: 1, borderRadius: 6,
        },
        {
          label: "Despesa",
          data: meses.map(m => despesaPorMes[m]),
          backgroundColor: "rgba(225,29,72,0.75)",
          borderColor: "rgb(225,29,72)",
          borderWidth: 1, borderRadius: 6,
        },
      ],
    });

    // ── planos de saúde ──
    const planosCount: Record<string, number> = {};
    (criancasData || []).forEach((c: { plano_saude?: string }) => {
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
    const nomesAcomp: Record<string, string> = {};
    (acompanhantesData || []).forEach((p: { id: string; nome: string }) => { nomesAcomp[p.id] = p.nome; });

    // especialistas: agenda.especialista_id → atendentes.id
    const nomesEsp: Record<string, string> = {};
    (especialistasData || []).forEach((e: { id: string; nome: string }) => { nomesEsp[e.id] = e.nome; });

    const ranking: Record<string, { nome: string; role: string; count: number }> = {};

    (atendMesData || []).forEach((a: { atendente_id: string }) => {
      const id = a.atendente_id;
      if (!ranking[id]) ranking[id] = { nome: nomesAcomp[id] || "Acompanhante", role: "atendente", count: 0 };
      ranking[id].count++;
    });
    (agendaMesData || []).forEach((a: { especialista_id?: string }) => {
      const id = a.especialista_id;
      if (!id) return;
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
      melhorProfissional: profOrd[0]?.nome ? primeiroNome(profOrd[0].nome) : "—",
      mediaAtend: totalCriancas > 0 ? Math.round((totalAtend / totalCriancas) * 10) / 10 : 0,
    });

    setLoadingAnalytics(false);
  }

  // ── opções dos gráficos ──────────────────────────────────────
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
        callbacks: { label: (ctx: { raw: unknown }) => ` R$ ${Number(ctx.raw).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#94a3b8", font: { size: 11 } } },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#94a3b8", font: { size: 11 },
          callback: (v: unknown) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
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
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-3">
        <svg className="animate-spin h-7 w-7 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-slate-400 text-sm">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-8 space-y-5">

      {/* DATAS COMEMORATIVAS (só o ADM vê) */}
      {dataComemorativa && (
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg shadow-teal-900/20">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="text-white font-bold text-sm">Hoje é {dataComemorativa}!</p>
            <p className="text-teal-100 text-xs">
              {new Date(hoje + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} — vale um agradecimento à equipe.
            </p>
          </div>
        </div>
      )}

      {proximasDatas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-2">Próximas datas comemorativas</p>
          <div className="flex flex-wrap gap-2">
            {proximasDatas.map((d) => (
              <div key={d.data} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
                <div className="text-center leading-none">
                  <p className="text-sm font-extrabold text-blue-700">{d.data.slice(8, 10)}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold">
                    {new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{d.nome}</p>
                  <p className="text-[10px] text-slate-400">em {d.diasRestantes} dias</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAINEL INFORMATIVO (saudação e "Ao vivo" já ficam na barra horizontal do topo) */}
      <PainelInformacoes />

      {/* DIVISOR */}
      <div className="flex items-center gap-2.5 pt-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"/>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Painel Operacional</span>
        <div className="flex-1 h-px bg-slate-200"/>
      </div>

      {/* KPIs OPERACIONAIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Atendimentos hoje", valor: metricas.totalDia,      sub: "sessões de AT hoje",  emoji: "🕐", bg: "bg-blue-50",   cor: "text-blue-600" },
          { label: "Acompanhantes",     valor: contagens.acompanhantes, sub: "ATs ativas",          emoji: "👤", bg: "bg-indigo-50", cor: "text-indigo-600" },
          { label: "Especialistas",     valor: contagens.especialistas, sub: "ativas",              emoji: "🩺", bg: "bg-teal-50",   cor: "text-teal-600" },
          { label: "Crianças",          valor: contagens.criancas,      sub: "cadastradas",         emoji: "🧒", bg: "bg-violet-50", cor: "text-violet-600" },
          { label: "Escolas",           valor: contagens.escolas,       sub: "parceiras",           emoji: "🏫", bg: "bg-amber-50",  cor: "text-amber-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="group bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center text-base group-hover:scale-110 transition-transform duration-200`}>
                {kpi.emoji}
              </div>
            </div>
            <p className={`text-3xl font-bold ${kpi.cor} tracking-tight`}>{kpi.valor}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ANIVERSARIANTES */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setAniversariantesAbertos(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Aniversariantes</h2>
            <p className="text-xs text-slate-400">{mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-pink-50 text-pink-600 border border-pink-100 px-2.5 py-1 rounded-full font-medium">
              {aniversariantes.length} este mês
            </span>
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${aniversariantesAbertos ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {aniversariantesAbertos && (
        <div className="p-4 border-t border-slate-100">
          {aniversariantes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Nenhum aniversariante este mês.</p>
          ) : (
            <div className="space-y-2">
              {aniversariantes.map((p, i) => {
                const isHoje    = p.diff === 0;
                const isProximo = p.diff > 0 && p.diff <= 7;
                const dataFormatada = `${p.data_nascimento.slice(8, 10)}/${p.data_nascimento.slice(5, 7)}`;
                return (
                  <div key={i} style={{ animationDelay: `${i * 60}ms` }} className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl border overflow-hidden animate-in fade-in slide-in-from-left-2 fill-mode-backwards ${
                    isHoje    ? "bg-pink-50 border-pink-200 shadow-sm" :
                    isProximo ? "bg-amber-50 border-amber-100" :
                                "bg-slate-50 border-slate-100"}`}>
                    {isHoje && (
                      <span className="absolute -right-2 -top-2 text-2xl rotate-12 animate-bounce [animation-duration:2s]" aria-hidden>🎈</span>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <span className={`absolute inset-0 rounded-full animate-ping ${
                          isHoje    ? "bg-pink-400 opacity-60" :
                          isProximo ? "bg-amber-300 opacity-40 [animation-duration:2s]" :
                                      "bg-slate-300 opacity-30 [animation-duration:3s]"}`} aria-hidden />
                        <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${
                          isHoje    ? "bg-pink-300 text-pink-900" :
                          isProximo ? "bg-amber-200 text-amber-800" :
                                      "bg-slate-200 text-slate-600"}`}>
                          {p.foto_url
                            ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                            : p.nome.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isHoje ? "text-pink-800" : "text-slate-700"}`}>
                          {p.nome} <span className="inline-block animate-bounce [animation-duration:1.5s]">{isHoje ? "🎉" : "🎂"}</span>
                        </p>
                        <p className="text-xs text-slate-400">{p.tipo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isHoje ? "text-pink-600" : isProximo ? "text-amber-600" : "text-slate-500"}`}>
                        {dataFormatada}
                      </p>
                      {(isHoje || isProximo) && (
                        <p className={`text-xs ${isHoje ? "text-pink-500 font-bold" : "text-amber-600"}`}>
                          {isHoje ? "Hoje!" : `em ${p.diff} dias`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>

      {/* GRÁFICOS OPERACIONAIS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Atendimentos por semana</h2>
            <p className="text-xs text-slate-400">
              AT + Especialista · {mesAtualLabel ? `em ${mesAtualLabel}` : "no mês atual"}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button onClick={() => mudarMes(-1)} disabled={carregandoGraficos}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-blue-700 transition disabled:opacity-40">‹</button>
            <span className="text-xs font-semibold text-slate-600 min-w-[110px] text-center">
              {carregandoGraficos ? "Carregando..." : mesAtualLabel}
            </span>
            <button onClick={() => mudarMes(1)} disabled={carregandoGraficos || mesSelecionado >= mesAtualReal}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-blue-700 transition disabled:opacity-40">›</button>
            {mesSelecionado && mesSelecionado !== mesAtualReal && (
              <button onClick={() => carregarMes(mesAtualReal)} className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 ml-1 hover:bg-blue-100 transition">
                Hoje
              </button>
            )}
          </div>
        </div>
        <div className="p-5 h-52">
          {graficoBarras
            ? <Bar data={graficoBarras} options={chartOptions}/>
            : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados semanais.</p></div>}
        </div>
      </div>

      {/* SEÇÃO ANALYTICS */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-slate-200"/>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analytics</span>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-3">Crianças ativas</p>
              <p className="text-3xl font-bold text-indigo-600">{kpisExtra.totalCriancas}</p>
              <p className="text-xs text-slate-400 mt-1">no sistema</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-3">Média atend./criança</p>
              <p className="text-3xl font-bold text-violet-600">{kpisExtra.mediaAtend}</p>
              <p className="text-xs text-slate-400 mt-1">neste mês</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
              <p className="text-xs font-medium text-slate-500 mb-3">Mais ativo no mês</p>
              <p className="text-lg font-bold text-fuchsia-600 truncate">{kpisExtra.melhorProfissional || "—"}</p>
              <p className="text-xs text-slate-400 mt-1">maior número de atendimentos</p>
            </div>
          </div>

          {/* HISTÓRICO FINANCEIRO */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Receita vs Despesa</h2>
              <p className="text-xs text-slate-400">Últimos 6 meses</p>
            </div>
            <div className="p-5 h-64">
              {historicoFinanceiro
                ? <Bar data={historicoFinanceiro} options={historicoOptions}/>
                : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados financeiros no período.</p></div>}
            </div>
          </div>

          {/* PLANOS + TOP PROFISSIONAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Crianças por plano de saúde</h2>
                <p className="text-xs text-slate-400">Distribuição atual</p>
              </div>
              <div className="p-5 h-60">
                {distribuicaoPlanos
                  ? <Pie data={distribuicaoPlanos} options={pieOptions}/>
                  : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados de plano.</p></div>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Top profissionais</h2>
                <p className="text-xs text-slate-400">Mais ativos no mês atual</p>
              </div>
              <div className="p-5 h-60">
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
