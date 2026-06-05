"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function GestaoDashboardPage() {
  
  const [loading, setLoading] = useState(true);

  // Métricas
  const [criancasAtivas, setCriancasAtivas] = useState(0);
  const [equipeTotal, setEquipeTotal] = useState(0);
  const [atendimentosHoje, setAtendimentosHoje] = useState(0);
  const [atendimentosMes, setAtendimentosMes] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);
  const [inadimplentes, setInadimplentes] = useState(0);
  const [valorInadimplente, setValorInadimplente] = useState(0);
  const [liminares, setLiminares] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [atendimentosPorModalidade, setAtendimentosPorModalidade] = useState<any>({});
  const [ultimosRelatorios, setUltimosRelatorios] = useState<any[]>([]);
  const [agendaHoje, setAgendaHoje] = useState<any[]>([]);

  const hoje = new Date().toISOString().split("T")[0];
  const mesAtual = new Date().toISOString().slice(0, 7);
  const hojeFormatado = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  useEffect(() => {
    async function carregar() {
      setLoading(true);

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
        const porModalidade: any = { liminar: 0, convenio: 0, particular: 0 };
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
        .eq("tipo", "relatorio_diario")
        .order("created_at", { ascending: false })
        .limit(5);
      setUltimosRelatorios(relatoriosDados || []);

      // Agenda de hoje
      const { data: agendaDados } = await supabase
        .from("agenda")
        .select("id, hora, servico, profissional_nome, criancas(nome)")
        .eq("data", hoje)
        .order("hora");
      setAgendaHoje(agendaDados || []);

      setLoading(false);
    }
    carregar();
  }, []);

  const roleLabel: any = {
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

  const totalAtend = Object.values(atendimentosPorModalidade).reduce((a: any, b: any) => a + b, 0) as number;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
        <svg className="animate-spin h-7 w-7 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-slate-400 text-sm">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8 space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{hojeFormatado}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
          Ao vivo
        </div>
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
          { label: "Crianças ativas",      valor: criancasAtivas,     sub: "em atendimento",           icon: "👶", bg: "bg-blue-50",    cor: "text-blue-600" },
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
            {equipe.map((p: any) => (
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