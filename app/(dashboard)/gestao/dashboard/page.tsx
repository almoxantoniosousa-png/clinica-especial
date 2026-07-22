"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PainelInformacoes, saudacao } from "@/components/painel-informacoes";
import { Bar, Line, Pie } from "react-chartjs-2";
import type { ChartData } from "chart.js";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from "chart.js";

type Liminar    = { id: string; crianca_id?: string; criancas?: { nome: string }; status?: string; data_vencimento: string; numero_processo?: string; vara?: string };
type Membro     = { nome: string; role: string; email?: string; logo_url?: string };
type Relatorio  = { id: string; created_at: string; titulo?: string; autor_nome?: string; criancas?: { nome: string }; tipo?: string };
type AgendaItem = { id: string; hora?: string; hora_inicio?: string; servico?: string; profissional_nome?: string; criancas?: { nome: string }; atendentes?: { nome: string }; status?: string };

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
);

export default function GestaoDashboardPage() {

  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState<string | undefined>(undefined);

  // Métricas operacionais
  const [criancasAtivas, setCriancasAtivas] = useState(0);
  const [equipeTotal, setEquipeTotal] = useState(0);
  const [atendimentosHoje, setAtendimentosHoje] = useState(0);
  const [atendimentosMes, setAtendimentosMes] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);
  const [inadimplentes, setInadimplentes] = useState(0);
  const [valorInadimplente, setValorInadimplente] = useState(0);
  const [liminares, setLiminares] = useState<Liminar[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [atendimentosPorModalidade, setAtendimentosPorModalidade] = useState<Record<string, number>>({});
  const [ultimosRelatorios, setUltimosRelatorios] = useState<Relatorio[]>([]);
  const [agendaHoje, setAgendaHoje] = useState<AgendaItem[]>([]);

  // Analytics
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [graficoVolume, setGraficoVolume] = useState<ChartData<"line"> | null>(null);
  const [graficoProfissionais, setGraficoProfissionais] = useState<ChartData<"bar"> | null>(null);
  const [graficoModalidades, setGraficoModalidades] = useState<ChartData<"pie"> | null>(null);
  const [graficoPlanos, setGraficoPlanos] = useState<ChartData<"pie"> | null>(null);
  const [kpiAnalytics, setKpiAnalytics] = useState({
    crescimento: 0, totalRelatorios: 0, mediaDiaria: 0, melhorProfissional: ""
  });

  const hoje = new Date().toISOString().split("T")[0];
  const mesAtual = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    async function carregarNome() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: u } = await supabase.from("usuarios").select("nome").eq("email", user.email).maybeSingle();
      setNome(u?.nome || undefined);
    }
    carregarNome();
  }, []);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      carregarAnalytics();

      // Crianças ativas
      const { count: totalCriancas } = await supabase
        .from("criancas").select("*", { count: "exact", head: true })
        .eq("ativo", true);
      setCriancasAtivas(totalCriancas || 0);

      // Equipe total
      const { count: totalEquipe } = await supabase
        .from("atendentes").select("*", { count: "exact", head: true })
        .eq("ativo", true);
      setEquipeTotal(totalEquipe || 0);

      // Atendimentos hoje
      const { count: totalHoje } = await supabase
        .from("atendimentos").select("*", { count: "exact", head: true })
        .eq("data", hoje);
      setAtendimentosHoje(totalHoje || 0);

      // Atendimentos e receita do mês
      const { data: atendMes } = await supabase
        .from("atendimentos")
        .select("valor_total, modalidade")
        .gte("data", `${mesAtual}-01`)
        .lte("data", `${mesAtual}-31`);

      if (atendMes) {
        setAtendimentosMes(atendMes.length);
        const receita = atendMes.reduce((acc, a) => acc + Number(a.valor_total || 0), 0);
        setReceitaMes(receita);

        // Por modalidade
        const porModalidade: Record<string, number> = { liminar: 0, convenio: 0, particular: 0 };
        atendMes.forEach(a => {
          if (a.modalidade) porModalidade[a.modalidade] = (porModalidade[a.modalidade] || 0) + 1;
        });
        setAtendimentosPorModalidade(porModalidade);
      }

      // Inadimplência
      const { data: cobrancas } = await supabase
        .from("cobrancas")
        .select("valor, crianca_id")
        .eq("status", "atrasado");

      if (cobrancas) {
        const uniqueClientes = new Set(cobrancas.map(c => c.crianca_id)).size;
        setInadimplentes(uniqueClientes);
        const totalAtrasado = cobrancas.reduce((acc, c) => acc + Number(c.valor || 0), 0);
        setValorInadimplente(totalAtrasado);
      }

      // Liminares próximas do vencimento (30 dias)
      const em30dias = new Date();
      em30dias.setDate(em30dias.getDate() + 30);
      const { data: liminaresDados } = await supabase
        .from("liminares")
        .select("*, criancas(nome)")
        .eq("status", "ativo")
        .lte("data_vencimento", em30dias.toISOString().split("T")[0])
        .order("data_vencimento");
      setLiminares(liminaresDados || []);

      // Equipe por função
      const { data: equipeDados } = await supabase
        .from("atendentes")
        .select("nome, role, email")
        .eq("ativo", true)
        .order("nome");
      setEquipe(equipeDados || []);

      // Últimos relatórios (5 mais recentes)
      const { data: relatoriosDados } = await supabase
        .from("prontuarios")
        .select("id, titulo, created_at, autor_nome, criancas(nome)")
        .in("tipo", ["prontuario", "relatorio", "relatorio_diario"])
        .order("created_at", { ascending: false })
        .limit(5);
      setUltimosRelatorios((relatoriosDados || []).map(r => ({ ...r, criancas: Array.isArray(r.criancas) ? r.criancas[0] : r.criancas })) as Relatorio[]);

      // Agenda de hoje
      const { data: agendaDados } = await supabase
        .from("agenda")
        .select("id, hora, servico, profissional_nome, criancas(nome)")
        .eq("data", hoje)
        .order("hora");
      setAgendaHoje((agendaDados || []).map(a => ({ ...a, criancas: Array.isArray(a.criancas) ? a.criancas[0] : a.criancas })) as AgendaItem[]);

      setLoading(false);
    }
    carregar();
  }, []);

  async function carregarAnalytics() {
    setLoadingAnalytics(true);
    const agora = new Date();

    const meses: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const mesAnt = meses[meses.length - 2];
    const mesAtualStr = meses[meses.length - 1];
    const [, mesFimNum] = mesAtualStr.split("-");
    const ultimoDia = new Date(agora.getFullYear(), Number(mesFimNum), 0).getDate();
    const dataIni = `${meses[0]}-01`;
    const dataFim = `${mesAtualStr}-${String(ultimoDia).padStart(2, "0")}`;

    const [
      { data: atendData },
      { data: criancasData },
      { data: relatoriosData },
      { data: perfisData },
    ] = await Promise.all([
      supabase.from("atendimentos").select("data, modalidade, atendente_id").gte("data", dataIni).lte("data", dataFim),
      supabase.from("criancas").select("plano_saude"),
      supabase.from("prontuarios").select("id").eq("tipo", "relatorio"),
      supabase.from("perfis").select("id, nome").eq("role", "atendente"),
    ]);

    // Volume mensal
    const volPorMes: Record<string, number> = {};
    meses.forEach(m => { volPorMes[m] = 0; });
    (atendData || []).forEach((a: { data: string; modalidade?: string; atendente_id?: string }) => {
      const m = a.data?.slice(0, 7);
      if (m && volPorMes[m] !== undefined) volPorMes[m]++;
    });

    const labelMeses = meses.map(m => {
      const [a, ms] = m.split("-");
      return new Date(Number(a), Number(ms) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    });

    setGraficoVolume({
      labels: labelMeses,
      datasets: [{
        label: "Atendimentos",
        data: meses.map(m => volPorMes[m]),
        borderColor: "rgb(99,102,241)",
        backgroundColor: "rgba(99,102,241,0.15)",
        tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "rgb(99,102,241)",
      }],
    });

    // Crescimento vs mês anterior
    const totalMesAtual = volPorMes[mesAtualStr] || 0;
    const totalMesAnt   = volPorMes[mesAnt]       || 0;
    const crescimento   = totalMesAnt > 0 ? Math.round(((totalMesAtual - totalMesAnt) / totalMesAnt) * 100) : 0;

    // Modalidades (mês atual)
    const modalMes = (atendData || []).filter((a: { data: string; modalidade?: string; atendente_id?: string }) => a.data?.startsWith(mesAtualStr));
    const modCount: Record<string, number> = { liminar: 0, convenio: 0, particular: 0 };
    modalMes.forEach(a => { if (a.modalidade) modCount[a.modalidade] = (modCount[a.modalidade] || 0) + 1; });

    setGraficoModalidades({
      labels: ["Liminar", "Convênio", "Particular"],
      datasets: [{
        data: [modCount.liminar, modCount.convenio, modCount.particular],
        backgroundColor: ["#6366f1", "#10b981", "#f97316"],
        hoverOffset: 8, borderWidth: 2, borderColor: "#fff",
      }],
    });

    // Planos de saúde
    const planosCount: Record<string, number> = {};
    (criancasData || []).forEach((c: { plano_saude?: string }) => {
      const p = c.plano_saude?.trim() || "Sem plano";
      planosCount[p] = (planosCount[p] || 0) + 1;
    });
    const planosOrd = Object.entries(planosCount).sort((a, b) => b[1] - a[1]);
    const coresPlano = ["#6366f1","#10b981","#f97316","#3b82f6","#ec4899","#84cc16","#94a3b8"];

    setGraficoPlanos({
      labels: planosOrd.map(([p]) => p),
      datasets: [{ data: planosOrd.map(([, n]) => n), backgroundColor: planosOrd.map((_, i) => coresPlano[i % coresPlano.length]), hoverOffset: 8, borderWidth: 2, borderColor: "#fff" }],
    });

    // Top profissionais (mês atual)
    const nomesMap: Record<string, string> = {};
    (perfisData || []).forEach((p: { id: string; nome: string }) => { nomesMap[p.id] = p.nome; });
    const rankMap: Record<string, number> = {};
    modalMes.forEach(a => {
      const id = a.atendente_id;
      if (id) rankMap[id] = (rankMap[id] || 0) + 1;
    });
    const ranking = Object.entries(rankMap)
      .map(([id, count]) => ({ nome: nomesMap[id]?.split(" ")[0] || "AT", count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);

    if (ranking.length > 0) {
      setGraficoProfissionais({
        labels: ranking.map(p => p.nome),
        datasets: [{
          label: "Atendimentos",
          data: ranking.map(p => p.count),
          backgroundColor: "rgba(99,102,241,0.8)",
          borderRadius: 6,
        }],
      });
    }

    const diasUteis = ultimoDia * (5 / 7);
    setKpiAnalytics({
      crescimento,
      totalRelatorios: relatoriosData?.length || 0,
      mediaDiaria: diasUteis > 0 ? Math.round((totalMesAtual / diasUteis) * 10) / 10 : 0,
      melhorProfissional: ranking[0]?.nome || "—",
    });

    setLoadingAnalytics(false);
  }

  const roleLabel: Record<string, { label: string; color: string }> = {
    gestao: { label: "Gestão", color: "bg-purple-100 text-purple-700" },
    adm: { label: "ADM", color: "bg-blue-100 text-blue-700" },
    financeiro: { label: "Financeiro", color: "bg-emerald-100 text-emerald-700" },
    supervisora: { label: "Supervisora", color: "bg-amber-100 text-amber-700" },
    at: { label: "AT", color: "bg-cyan-100 text-cyan-700" },
    especialista: { label: "Especialista", color: "bg-rose-100 text-rose-700" },
    apoio: { label: "Apoio", color: "bg-slate-100 text-slate-700" },
    familia: { label: "Família", color: "bg-orange-100 text-orange-700" },
  };

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const totalAtend = Object.values(atendimentosPorModalidade).reduce((a, b) => a + b, 0);

  const optLine = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { cornerRadius: 8 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#94a3b8", font: { size: 11 } } },
      y: { grid: { color: "#f1f5f9" }, ticks: { color: "#94a3b8", font: { size: 11 } }, beginAtZero: true },
    },
  };

  const optBar = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { cornerRadius: 8 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 11 } } },
      y: { grid: { color: "#f1f5f9" }, ticks: { color: "#94a3b8", font: { size: 11 } }, beginAtZero: true },
    },
  };

  const optBarH = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: { legend: { display: false }, tooltip: { cornerRadius: 8 } },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { color: "#94a3b8", font: { size: 11 } }, beginAtZero: true },
      y: { grid: { display: false }, ticks: { color: "#475569", font: { size: 12 } } },
    },
  };

  const optPie = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { font: { size: 11 }, color: "#64748b", padding: 12 } }, tooltip: { cornerRadius: 8 } },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center gap-3">
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

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{saudacao(nome)}</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-light tracking-wide">A Clínica Abraço te deseja um excelente trabalho</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
          Ao vivo
        </div>
      </div>

      {/* PAINEL INFORMATIVO */}
      <PainelInformacoes />

      {/* DIVISOR */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200"/>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel Operacional</span>
        <div className="flex-1 h-px bg-slate-200"/>
      </div>

      {/* ALERTAS */}
      {(liminares.length > 0 || inadimplentes > 0) && (
        <div className="space-y-2">
          {liminares.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-amber-800">
              <span className="flex-shrink-0">⚠️</span>
              <span className="font-bold">{liminares.length} liminar(es)</span> vencendo nos próximos 30 dias
            </div>
          )}
          {inadimplentes > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800">
              <span className="flex-shrink-0">🔴</span>
              <span className="font-bold">{inadimplentes} família(s)</span> em atraso — R$ {valorInadimplente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Crianças ativas",      valor: criancasAtivas,     sub: "ativas na clínica",        icon: "👶", bg: "bg-blue-50",    cor: "text-blue-600" },
          { label: "Profissionais ativos", valor: equipeTotal,         sub: "na equipe",                icon: "👥", bg: "bg-purple-50",  cor: "text-purple-600" },
          { label: "Atendimentos hoje",    valor: atendimentosHoje,    sub: "registrados hoje",         icon: "📅", bg: "bg-amber-50",   cor: "text-amber-600" },
          { label: "Atendimentos no mês",  valor: atendimentosMes,     sub: `R$ ${receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: "📋", bg: "bg-emerald-50", cor: "text-emerald-600" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center text-base`}>{kpi.icon}</div>
            </div>
            <p className={`text-3xl font-bold ${kpi.cor}`}>{kpi.valor}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* FINANCEIRO + MODALIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Situação das Famílias</h2>
            <p className="text-xs text-slate-400">Pagamentos em dia vs atrasados</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-medium text-emerald-600">Em dia</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{Math.max(0, criancasAtivas - inadimplentes)}</p>
              <p className="text-xs text-slate-400 mt-0.5">famílias</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-xs font-medium text-red-600">Atrasadas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{inadimplentes}</p>
              <p className="text-xs text-slate-400 mt-0.5">R$ {valorInadimplente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Atendimentos por Modalidade</h2>
            <p className="text-xs text-slate-400">Distribuição no mês atual</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { key: "liminar",    label: "Liminar Judicial", color: "bg-blue-500" },
              { key: "convenio",   label: "Convênio",         color: "bg-emerald-500" },
              { key: "particular", label: "Particular",       color: "bg-purple-500" },
            ].map((m) => {
              const val = atendimentosPorModalidade[m.key] || 0;
              const pct = totalAtend > 0 ? Math.round((val / totalAtend) * 100) : 0;
              return (
                <div key={m.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600">{m.label}</span>
                    <span className="text-xs font-semibold text-slate-700">{val} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full transition-all`} style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LIMINARES VENCENDO */}
      {liminares.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Liminares vencendo em 30 dias</h3>
              <p className="text-xs text-amber-600">{liminares.length} alerta(s) — verifique o setor jurídico</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {liminares.map((l) => {
              const diasRestantes = Math.ceil(
                (new Date(l.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{l.criancas?.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Processo: {l.numero_processo || "não informado"} · {l.vara || ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border
                      ${diasRestantes <= 7 ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                      {diasRestantes <= 0 ? "VENCIDA" : `${diasRestantes} dias`}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{new Date(l.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EQUIPE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Equipe Ativa</h3>
            <p className="text-xs text-slate-400">{equipe.length} profissionais</p>
          </div>
        </div>
        {equipe.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-3xl">👥</span>
            <p className="text-sm text-slate-400">Nenhum profissional cadastrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {equipe.map((p) => (
              <div key={p.email} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${roleLabel[p.role]?.color || "bg-slate-100 text-slate-700"}`}>
                    {iniciais(p.nome)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.nome}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleLabel[p.role]?.color || "bg-slate-100 text-slate-600"}`}>
                  {roleLabel[p.role]?.label || p.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AGENDA + RELATÓRIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Agenda de Hoje</h3>
              <p className="text-xs text-slate-400">{agendaHoje.length} atendimento(s)</p>
            </div>
            <Link href="/gestao/agenda" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Ver tudo</Link>
          </div>
          {agendaHoje.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
              <span className="text-2xl">📭</span>
              <p className="text-xs">Nenhum atendimento hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {agendaHoje.slice(0, 5).map(ag => (
                <div key={ag.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-blue-600 min-w-[3rem]">{ag.hora?.slice(0, 5) || "--:--"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{ag.criancas?.nome || "—"}</p>
                    {ag.profissional_nome && <p className="text-[10px] text-slate-400 truncate">{ag.profissional_nome}</p>}
                  </div>
                  {ag.servico && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">{ag.servico}</span>
                  )}
                </div>
              ))}
              {agendaHoje.length > 5 && (
                <p className="text-xs text-center text-slate-400 py-2">+{agendaHoje.length - 5} mais</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Últimos Relatórios</h3>
              <p className="text-xs text-slate-400">Prontuários recentes</p>
            </div>
            <Link href="/gestao/relatorios" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Ver tudo</Link>
          </div>
          {ultimosRelatorios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
              <span className="text-2xl">📭</span>
              <p className="text-xs">Nenhum relatório ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ultimosRelatorios.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-sm flex-shrink-0">📝</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{r.criancas?.nome || "—"}</p>
                    <p className="text-[10px] text-slate-400 truncate">{r.autor_nome || "—"}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 flex-shrink-0">
                    {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ANALYTICS */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-slate-200"/>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analytics</span>
        <div className="flex-1 h-px bg-slate-200"/>
      </div>

      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-10 gap-3">
          <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-slate-400 text-sm">Carregando analytics...</p>
        </div>
      ) : (
        <>
          {/* KPIs Analytics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-3">Crescimento</p>
              <p className={`text-3xl font-bold ${kpiAnalytics.crescimento >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {kpiAnalytics.crescimento >= 0 ? "+" : ""}{kpiAnalytics.crescimento}%
              </p>
              <p className="text-xs text-slate-400 mt-1">vs mês anterior</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-3">Média diária</p>
              <p className="text-3xl font-bold text-indigo-600">{kpiAnalytics.mediaDiaria}</p>
              <p className="text-xs text-slate-400 mt-1">atendimentos/dia</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-3">Relatórios enviados</p>
              <p className="text-3xl font-bold text-violet-600">{kpiAnalytics.totalRelatorios}</p>
              <p className="text-xs text-slate-400 mt-1">total no sistema</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-3">Mais ativo no mês</p>
              <p className="text-xl font-bold text-fuchsia-600 truncate">{kpiAnalytics.melhorProfissional}</p>
              <p className="text-xs text-slate-400 mt-1">maior volume de atend.</p>
            </div>
          </div>

          {/* Volume mensal */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Volume de atendimentos</h2>
              <p className="text-xs text-slate-400">Evolução nos últimos 6 meses</p>
            </div>
            <div className="p-5 h-52">
              {graficoVolume
                ? <Line data={graficoVolume} options={optLine}/>
                : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados.</p></div>}
            </div>
          </div>

          {/* Profissionais + Modalidades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Top profissionais</h2>
                <p className="text-xs text-slate-400">Mais ativos no mês atual</p>
              </div>
              <div className="p-5 h-56">
                {graficoProfissionais
                  ? <Bar data={graficoProfissionais} options={optBarH}/>
                  : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados.</p></div>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Modalidades no mês</h2>
                <p className="text-xs text-slate-400">Liminar · Convênio · Particular</p>
              </div>
              <div className="p-5 h-56">
                {graficoModalidades
                  ? <Pie data={graficoModalidades} options={optPie}/>
                  : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados.</p></div>}
              </div>
            </div>
          </div>

          {/* Planos de saúde */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Crianças por plano de saúde</h2>
              <p className="text-xs text-slate-400">Distribuição atual</p>
            </div>
            <div className="p-5 h-56">
              {graficoPlanos
                ? <Pie data={graficoPlanos} options={optPie}/>
                : <div className="h-full flex items-center justify-center"><p className="text-slate-400 text-sm">Sem dados.</p></div>}
            </div>
          </div>
        </>
      )}

      {/* ATALHOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Mural",      icon: "📢", href: "/gestao/mural",      color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" },
          { label: "Crianças",   icon: "👶", href: "/gestao/criancas",   color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
          { label: "Agenda",     icon: "📅", href: "/gestao/agenda",     color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" },
          { label: "Relatórios", icon: "📊", href: "/gestao/relatorios", color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border font-semibold text-sm transition active:scale-95 ${a.color}`}>
            <span className="text-2xl">{a.icon}</span>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}