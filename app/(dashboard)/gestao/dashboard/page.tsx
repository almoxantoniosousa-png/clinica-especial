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
        <p className="text-slate-400 text-sm font-medium">Carregando painel da gestão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md bg-white p-0.5">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"/>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">Portal da Gestão</h1>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
              Clínica Abraço — Visão Executiva
            </p>
          </div>
        </div>
        <div className="self-start sm:self-auto flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span className="text-xs font-medium text-slate-600 capitalize">{hojeFormatado}</span>
        </div>
      </div>

      {/* ALERTAS */}
      {(liminares.length > 0 || inadimplentes > 0) && (
        <div className="space-y-2">
          {liminares.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
              <p className="text-sm font-medium text-amber-800">
                <span className="font-bold">{liminares.length} liminar(es)</span> vencendo nos próximos 30 dias — verifique o setor jurídico!
              </p>
            </div>
          )}
          {inadimplentes > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-red-500 text-lg flex-shrink-0">🔴</span>
              <p className="text-sm font-medium text-red-800">
                <span className="font-bold">{inadimplentes} família(s)</span> com pagamento em atraso —
                total de <span className="font-bold">R$ {valorInadimplente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* CARDS MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Crianças</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-base">👶</div>
          </div>
          <p className="text-3xl font-black text-blue-600">{criancasAtivas}</p>
          <p className="text-xs text-slate-400 mt-1">em atendimento ativo</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-purple-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Equipe</p>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-base">👥</div>
          </div>
          <p className="text-3xl font-black text-purple-600">{equipeTotal}</p>
          <p className="text-xs text-slate-400 mt-1">profissionais ativos</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Receita</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-base">💰</div>
          </div>
          <p className="text-xl font-black text-emerald-600">
            R$ {receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">{atendimentosMes} atendimentos no mês</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hoje</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-base">📅</div>
          </div>
          <p className="text-3xl font-black text-amber-500">{atendimentosHoje}</p>
          <p className="text-xs text-slate-400 mt-1">atendimentos hoje</p>
        </div>
      </div>

      {/* SEGUNDA LINHA — Inadimplência + Modalidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* INADIMPLÊNCIA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">Situação Financeira das Famílias</h2>
            <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium border border-red-100">
              Gestão
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Em dia</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {Math.max(0, criancasAtivas - inadimplentes)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">famílias</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Atrasadas</p>
              <p className="text-2xl font-black text-red-600 mt-1">{inadimplentes}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                R$ {valorInadimplente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            * Detalhes disponíveis no portal do Financeiro
          </p>
        </div>

        {/* MODALIDADES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">Atendimentos por Modalidade</h2>
            <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium border border-blue-100">
              Este mês
            </span>
          </div>
          <div className="space-y-3">
            {[
              { key: "liminar", label: "⚖️ Liminar Judicial", color: "bg-blue-500" },
              { key: "convenio", label: "📋 Convênio", color: "bg-emerald-500" },
              { key: "particular", label: "💳 Particular", color: "bg-purple-500" },
            ].map((m) => {
              const val = atendimentosPorModalidade[m.key] || 0;
              const pct = totalAtend > 0 ? Math.round((val / totalAtend) * 100) : 0;
              return (
                <div key={m.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{m.label}</span>
                    <span className="text-xs font-bold text-slate-700">{val} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
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
          <div className="flex items-center justify-between px-5 py-4 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <span>⚖️</span>
              <h3 className="font-semibold text-amber-800 text-sm">Liminares Vencendo em 30 dias</h3>
            </div>
            <span className="text-xs bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full font-bold">
              {liminares.length} alerta(s)
            </span>
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
                    <p className="text-xs text-slate-400 mt-0.5">
                      Processo: {l.numero_processo || "não informado"} · {l.vara || ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                      ${diasRestantes <= 7
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                      {diasRestantes <= 0 ? "VENCIDA" : `${diasRestantes} dias`}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(l.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EQUIPE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Equipe Ativa</h3>
          <span className="text-xs bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-medium">
            {equipe.length} profissionais
          </span>
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
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${roleLabel[p.role]?.color || "bg-slate-100 text-slate-700"}`}>
                    {iniciais(p.nome)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.nome}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                  ${roleLabel[p.role]?.color || "bg-slate-100 text-slate-600"}`}>
                  {roleLabel[p.role]?.label || p.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ATALHOS RÁPIDOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Mural", icon: "📢", href: "/gestao/mural", color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Crianças", icon: "👶", href: "/gestao/criancas", color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Agenda", icon: "📅", href: "/gestao/agenda", color: "bg-purple-50 border-purple-200 text-purple-700" },
          { label: "Relatórios", icon: "📊", href: "/gestao/relatorios", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border
              font-semibold text-sm transition hover:scale-105 active:scale-95 ${a.color}`}
          >
            <span className="text-2xl">{a.icon}</span>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}