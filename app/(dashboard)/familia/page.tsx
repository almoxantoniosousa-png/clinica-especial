"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { mesAtualLocal } from "@/lib/dataUtils";
import { FamiliaBottomNav, type FamiliaTabId } from "@/components/familia-bottom-nav";

type Aba = "diario" | "comunicados" | "momentos" | "evolucao";

type CriancaInfo = {
  id: string; nome: string;
  foto_url?: string | null; diagnostico?: string | null; data_nascimento?: string | null;
};
type Responsavel = {
  id: string; nome: string; email: string; criancas: CriancaInfo;
};
type FormDiario = {
  hora_chegada?: string; hora_saida?: string; interacao?: string[]; interacao_obs?: string;
  periodo_menstrual_obs?: string; banheiro_obs?: string; evacuou_obs?: string;
  autonomia_nivel?: number; idas_banheiro?: number;
  evacuou?: boolean; periodo_menstrual?: boolean;
  socializacao?: string[]; amizades_intervalo?: string; atencao?: string[];
  agua_ingestao?: string;
  lanche?: string; comeu_tudo?: boolean; comeu_tudo_obs?: string;
  lanche_independencia?: string[]; lanche_resultado?: string[]; lanche_comportamento?: string[];
  atividades_sala?: string; interacao_sala?: string; tarefa_casa?: string;
  tarefa_livro?: string; tarefa_paginas?: string;
  materiais_pedir?: string; obs_gerais?: string; eventos_escolares?: string;
  obs_supervisora?: string;
};

export default function FamiliaDashboardPage() {
  const router = useRouter();
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("diario");
  const [responsavel, setResponsavel] = useState<Responsavel | null>(null);
  const [crianca, setCrianca] = useState<CriancaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      // Usa o singleton para pegar o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      console.log("User logado:", user?.email);
      if (!user) { setLoading(false); return; }

      // Busca o responsável pelo email
      const { data: resp, error } = await supabaseClient
        .from("responsaveis")
        .select("*, criancas(id, nome, foto_url, diagnostico, data_nascimento)")
        .eq("email", user.email)
        .eq("ativo", true)
        .maybeSingle();

      console.log("Responsavel:", resp);
      console.log("Erro:", error);

      if (resp) {
        setResponsavel(resp);
        setCrianca(resp.criancas);
      }
      setLoading(false);
    }
    carregar();
  }, []);

  const abas = [
    { id: "diario",      label: "Diário",    icon: "📖" },
    { id: "comunicados", label: "Avisos",    icon: "💌" },
    { id: "momentos",    label: "Momentos",  icon: "📷" },
    { id: "evolucao",    label: "Evolução",  icon: "🌱" },
  ];

  function selecionarTabRodape(id: FamiliaTabId) {
    if (id === "conversas") { router.push("/chat"); return; }
    setAba(id as Aba);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-orange-400 mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-slate-400 text-sm">Carregando portal...</p>
        </div>
      </div>
    );
  }

  if (!crianca) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">👶</span>
          </div>
          <h2 className="font-bold text-slate-800 text-lg">Portal não configurado</h2>
          <p className="text-slate-500 text-sm">Seu acesso ainda não foi vinculado a uma criança. Entre em contato com a clínica.</p>
        </div>
      </div>
    );
  }

  function calcularIdade(dataNasc: string) {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    const anos = hoje.getFullYear() - nasc.getFullYear();
    if (anos === 0) {
      const meses = hoje.getMonth() - nasc.getMonth();
      return `${meses} meses`;
    }
    return `${anos} anos`;
  }

  return (
    <div className="min-h-screen bg-transparent">

      {/* HEADER DA CRIANÇA */}
      <div className="px-4 pt-6 pb-6 relative overflow-hidden rounded-[32px] mx-2 mt-2 sm:max-w-3xl sm:mx-auto"
        style={{ background: "linear-gradient(to bottom right, #059669, #fbbf24)" }}>
        <div className="absolute w-40 h-40 rounded-full bg-white/10 -top-16 -right-10" aria-hidden />
        <div className="absolute w-24 h-24 rounded-full bg-white/10 -bottom-10 left-4" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0 bg-white">
              {crianca.foto_url
                ? <img src={crianca.foto_url} alt={crianca.nome} className="w-full h-full object-cover"/>
                : <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xl">
                    {crianca.nome?.charAt(0)}
                  </div>}
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Portal da Família</p>
              <h1 className="text-white text-xl font-bold">{crianca.nome}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {crianca.data_nascimento && (
                  <span className="text-white/80 text-xs">{calcularIdade(crianca.data_nascimento)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Saudação */}
          <div className="mt-4 bg-white/20 rounded-xl px-4 py-3">
            <p className="text-white text-sm">
              Olá, <span className="font-semibold">{responsavel?.nome?.split(" ")[0]}</span>! 👋
              Acompanhe por aqui as novidades do dia a dia.
            </p>
          </div>
        </div>
      </div>

      {/* ABAS — só no desktop/tablet; no celular a navegação vai pro rodapé */}
      <div className="hidden sm:block sm:max-w-3xl mx-auto px-4 mt-5">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-1.5 flex gap-1 relative">
          {abas.map(a => (
            <button key={a.id} onClick={() => setAba(a.id as Aba)}
              className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-semibold transition-all
                ${aba === a.id ? "shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
              style={aba === a.id ? { background: "#ffb96d", color: "#9f2d00" } : undefined}>
              <span className="text-base sm:text-sm">{a.icon}</span>
              <span className="truncate max-w-full">{a.label}</span>
            </button>
          ))}
          <button onClick={() => router.push("/chat")}
            className="flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-semibold transition-all text-slate-500 hover:bg-slate-50">
            <span className="text-base sm:text-sm">💬</span>
            <span className="truncate max-w-full">Conversas</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="sm:max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {aba === "diario"      && <AbaDiario    criancaId={crianca.id} responsavelId={responsavel?.id || ""} />}
        {aba === "comunicados" && <AbaAvisos    criancaId={crianca.id} responsavelId={responsavel?.id || ""} />}
        {aba === "momentos"    && <AbaMomentos  criancaId={crianca.id} responsavelId={responsavel?.id || ""} />}
        {aba === "evolucao"    && <AbaEvolucao  criancaId={crianca.id} responsavelId={responsavel?.id || ""} />}
      </div>

      <FamiliaBottomNav ativa={aba} onSelect={selecionarTabRodape} />
    </div>
  );
}

// =============================================
// ABA DIÁRIO — comunicados diários enviados pela supervisora
// =============================================
function AbaDiario({ criancaId, responsavelId }: { criancaId: string; responsavelId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [ocultando, setOcultando] = useState(false);
  const mesAtual = mesAtualLocal(); // "2026-06"
  const [mesesAbertos, setMesesAbertos] = useState<Set<string>>(new Set([mesAtual]));

  const carregar = async () => {
    setLoading(true);
    const [{ data }, idsOcultos] = await Promise.all([
      supabase2
        .from("formularios_escolares")
        .select("*")
        .eq("crianca_id", criancaId)
        .eq("enviado_familia", true)
        .order("data", { ascending: false }),
      carregarOcultos(supabase2, responsavelId, "diario"),
    ]);
    setDiarios((data || []).filter((d: any) => !idsOcultos.has(d.id)));
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [criancaId, responsavelId]);

  async function ocultar(diarioId: string) {
    if (!responsavelId) return;
    setOcultando(true);
    const { error } = await ocultarRegistro(supabase2, responsavelId, "diario", diarioId);
    setOcultando(false);
    if (!error) {
      setDiarios(prev => prev.filter(d => d.id !== diarioId));
      setDetalhe(null);
    }
  }

  // Agrupa registros por mês "2026-06" → array de diarios
  const porMes = useMemo(() => {
    const mapa = new Map<string, any[]>();
    diarios.forEach(d => {
      const chave = d.data?.slice(0, 7) || "desconhecido";
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(d);
    });
    return Array.from(mapa.entries()); // [[mes, [diarios]], ...]
  }, [diarios]);

  function labelMes(mes: string) {
    const [ano, m] = mes.split("-");
    const data = new Date(Number(ano), Number(m) - 1, 1);
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  function toggleMes(mes: string) {
    setMesesAbertos(prev => {
      const novo = new Set(prev);
      if (novo.has(mes)) novo.delete(mes);
      else novo.add(mes);
      return novo;
    });
  }

  const autonomiaFrase: Record<number, string> = {
    4: "Hoje ela fez tudo sozinha, sem precisar de ajuda — um baita avanço!",
    3: "Hoje ela teve bastante independência, com uma ajudinha pontual.",
    2: "Hoje ela contou com apoio físico ou verbal em algumas atividades.",
    1: "Hoje ela precisou de mais apoio da equipe em quase tudo.",
  };

  // Card de conteúdo: título + cor (a mesma paleta quente do resto do portal) + frases já em tom de conversa.
  type CardDiario = { titulo: string; cor: "coral" | "mint" | "gold" | "lav"; frases: string[]; nota?: string; alerta?: boolean };

  const corCard: Record<CardDiario["cor"], string> = {
    coral: "bg-orange-50 text-orange-700 border-orange-100",
    mint:  "bg-emerald-50 text-emerald-700 border-emerald-100",
    gold:  "bg-amber-50 text-amber-700 border-amber-100",
    lav:   "bg-violet-50 text-violet-700 border-violet-100",
  };

  function renderConteudo(d: FormDiario) {
    const cards: CardDiario[] = [];

    // Chegada e saída
    const chegadaFrases: string[] = [];
    if (d.hora_chegada && d.hora_saida) chegadaFrases.push(`Chegou às ${d.hora_chegada} e saiu às ${d.hora_saida}.`);
    else if (d.hora_chegada) chegadaFrases.push(`Chegou às ${d.hora_chegada}.`);
    if (d.interacao?.length) chegadaFrases.push(`Esteve ${(d.interacao as string[]).join(" e ").toLowerCase()} o dia todo.`);
    if (chegadaFrases.length || d.interacao_obs) {
      cards.push({ titulo: "🏁 Chegada e saída", cor: "coral", frases: chegadaFrases, nota: d.interacao_obs });
    }

    // Autonomia — discreta por padrão; só destaca quando a AT deixou uma observação específica.
    if (d.autonomia_nivel || d.banheiro_obs || d.evacuou_obs || d.periodo_menstrual_obs || d.agua_ingestao) {
      const notaCuidados = [d.banheiro_obs, d.evacuou_obs, d.periodo_menstrual_obs].filter(Boolean).join(" ") || undefined;
      const frasesAutonomia = d.autonomia_nivel ? [autonomiaFrase[d.autonomia_nivel]] : [];
      if (d.agua_ingestao) frasesAutonomia.push(`💧 Água: ${d.agua_ingestao.toLowerCase()}.`);
      cards.push({
        titulo: "🌟 Autonomia",
        cor: "mint",
        frases: frasesAutonomia,
        nota: notaCuidados ? notaCuidados : (d.evacuou != null || d.idas_banheiro != null) ? "Rotina de higiene tranquila, sem nada fora do comum." : undefined,
      });
    }

    // Lanche e recreio
    const recreioFrases: string[] = [];
    if (d.lanche) recreioFrases.push(`No lanche: ${d.lanche.toLowerCase()}${d.comeu_tudo ? ", comeu tudinho" : ""}.`);
    if (d.lanche_resultado?.length) recreioFrases.push((d.lanche_resultado as string[]).join(", ") + ".");
    if (d.lanche_independencia?.length) recreioFrases.push(`Na hora de comer: ${(d.lanche_independencia as string[]).join(", ").toLowerCase()}.`);
    if (d.lanche_comportamento?.length) recreioFrases.push((d.lanche_comportamento as string[]).join(", ") + ".");
    if (d.socializacao?.length) recreioFrases.push(`No intervalo, brincou bem — ${(d.socializacao as string[]).join(", ").toLowerCase()}.`);
    if (d.amizades_intervalo) recreioFrases.push(d.amizades_intervalo);
    if (recreioFrases.length || d.comeu_tudo_obs) {
      cards.push({ titulo: "🍎 Lanche e recreio", cor: "gold", frases: recreioFrases, nota: d.comeu_tudo_obs });
    }

    // Na sala + tarefa de casa
    const salaFrases: string[] = [];
    if (d.atividades_sala) salaFrases.push(d.atividades_sala);
    if (d.interacao_sala) salaFrases.push(d.interacao_sala);
    const tarefaCabecalho = [d.tarefa_livro, d.tarefa_paginas ? `págs. ${d.tarefa_paginas}` : null].filter(Boolean).join(" — ");
    if (tarefaCabecalho) salaFrases.push(`📖 Tarefa de casa: ${tarefaCabecalho}.`);
    if (d.tarefa_casa) salaFrases.push(tarefaCabecalho ? d.tarefa_casa : `Para praticar em casa: ${d.tarefa_casa} 🧸`);
    if (d.eventos_escolares) salaFrases.push(`🎉 Na escola hoje: ${d.eventos_escolares}`);
    if (salaFrases.length || d.obs_gerais) {
      cards.push({ titulo: "📚 Na sala", cor: "lav", frases: salaFrases, nota: d.obs_gerais });
    }

    return (
      <div className="space-y-3">
        {cards.map((c, i) => (
          <div key={i} className={`rounded-2xl px-4 py-3.5 border ${corCard[c.cor]}`}>
            <p className="text-xs font-bold mb-1.5">{c.titulo}</p>
            {c.frases.map((f, j) => (
              <p key={j} className="text-sm text-slate-700 leading-relaxed mb-1 last:mb-0">{f}</p>
            ))}
            {c.nota && (
              <p className="text-xs text-slate-500 leading-relaxed mt-2 pt-2 border-t border-dashed border-current/20">{c.nota}</p>
            )}
          </div>
        ))}

        {d.materiais_pedir && (
          <div className="rounded-2xl px-4 py-3.5 bg-red-50 border border-red-200">
            <p className="text-xs font-bold text-red-500 mb-1">⚠️ Aviso importante</p>
            <p className="text-sm text-red-700 leading-relaxed font-medium">{d.materiais_pedir}</p>
          </div>
        )}

        {d.obs_supervisora && (
          <div className="rounded-2xl px-4 py-3.5 bg-orange-50 border border-orange-100">
            <p className="text-xs font-bold text-orange-600 mb-1">💬 Recado da Supervisora</p>
            <p className="text-sm text-orange-800 leading-relaxed">{d.obs_supervisora}</p>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (diarios.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📋</span>
      <p className="text-slate-400 text-sm mt-3">Nenhum comunicado diário ainda.</p>
      <p className="text-xs text-slate-300 mt-1">Os comunicados aparecerão aqui após revisão da supervisora.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{diarios.length} comunicado{diarios.length !== 1 ? "s" : ""} no total</p>

      {porMes.map(([mes, registros]) => {
        const aberto = mesesAbertos.has(mes);
        const temUrgenteMes = registros.some(d => !!d.materiais_pedir);
        return (
          <div key={mes} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Cabeçalho do mês — clicável */}
            <button onClick={() => toggleMes(mes)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-base flex-shrink-0">
                  🗓️
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm capitalize">{labelMes(mes)}</p>
                  <p className="text-xs text-slate-400">{registros.length} comunicado{registros.length !== 1 ? "s" : ""}{temUrgenteMes ? " · ⚠️ aviso urgente" : ""}</p>
                </div>
              </div>
              <span className={`text-slate-400 text-lg transition-transform duration-200 ${aberto ? "rotate-90" : ""}`}>›</span>
            </button>

            {/* Lista do mês — colapsável */}
            {aberto && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {registros.map(d => {
                  const dataFormatada = new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                  const temUrgente = !!d.materiais_pedir;
                  return (
                    <div key={d.id} onClick={() => setDetalhe(d)}
                      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base ${temUrgente ? "bg-red-100" : "bg-orange-50"}`}>
                        {temUrgente ? "⚠️" : "📖"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm capitalize">{dataFormatada}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {d.hora_chegada && <span className="text-xs text-slate-400">🕐 {d.hora_chegada}</span>}
                          {temUrgente && <span className="text-xs font-semibold text-red-500">⚠️ Aviso urgente</span>}
                          {d.interacao?.length > 0 && (
                            <span className="text-xs text-slate-400 truncate">{(d.interacao as string[]).slice(0,2).join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-300 text-lg flex-shrink-0">›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
              style={{ background: "linear-gradient(to right, #f97316, #fbbf24)" }}>
              <div>
                <p className="font-bold text-white text-sm capitalize">
                  {new Date(detalhe.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <p className="text-white/80 text-xs mt-0.5">Comunicado Diário</p>
              </div>
              <button onClick={() => setDetalhe(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/80 hover:text-white transition">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {renderConteudo(detalhe)}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 space-y-2">
              <button onClick={() => setDetalhe(null)}
                className="w-full h-11 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition">
                Fechar
              </button>
              <button onClick={() => ocultar(detalhe.id)} disabled={ocultando}
                className="w-full text-center text-xs text-slate-300 hover:text-red-400 transition disabled:opacity-50">
                {ocultando ? "Removendo..." : "Remover da minha visualização"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// helper compartilhado
function labelMes(mes: string) {
  const [ano, m] = mes.split("-");
  return new Date(Number(ano), Number(m) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function useMesesAbertos() {
  const mesAtual = mesAtualLocal();
  const [abertos, setAbertos] = useState<Set<string>>(new Set([mesAtual]));
  const toggle = (mes: string) => setAbertos(prev => {
    const n = new Set(prev);
    n.has(mes) ? n.delete(mes) : n.add(mes);
    return n;
  });
  return { abertos, toggle };
}

// Ocultar (excluir só da própria visualização) — usado nas 4 abas do portal
type Supa = ReturnType<typeof createSupabaseBrowserClient>;

async function carregarOcultos(supabase2: Supa, responsavelId: string, tipo: string): Promise<Set<string>> {
  if (!responsavelId) return new Set();
  const { data } = await supabase2.from("portal_ocultos").select("registro_id").eq("responsavel_id", responsavelId).eq("tipo", tipo);
  return new Set((data || []).map((o: any) => o.registro_id));
}

function ocultarRegistro(supabase2: Supa, responsavelId: string, tipo: string, registroId: string) {
  return supabase2.from("portal_ocultos").insert({ responsavel_id: responsavelId, tipo, registro_id: registroId });
}

// =============================================
// ABA AVISOS
// =============================================
function AbaAvisos({ criancaId, responsavelId }: { criancaId: string; responsavelId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [ocultando, setOcultando] = useState(false);
  const { abertos, toggle } = useMesesAbertos();

  const carregar = async () => {
    setLoading(true);
    const [{ data: comunicados }, { data: muralPosts }, ocultosComunicado, ocultosMural] = await Promise.all([
      supabase2.from("portal_comunicados")
        .select("*").eq("crianca_id", criancaId).order("created_at", { ascending: false }),
      supabase2.from("mural")
        .select("id, titulo, conteudo, foto_url, created_at")
        .in("destinatario", ["familia", "todos"])
        .order("created_at", { ascending: false })
        .limit(20),
      carregarOcultos(supabase2, responsavelId, "aviso_comunicado"),
      carregarOcultos(supabase2, responsavelId, "aviso_mural"),
    ]);
    const muralFormatados = (muralPosts || [])
      .filter((m: any) => !ocultosMural.has(m.id))
      .map((m: any) => ({ ...m, descricao: m.conteudo, _tipo: "mural" }));
    const comunicadosFiltrados = (comunicados || []).filter((c: any) => !ocultosComunicado.has(c.id));
    setAvisos([...muralFormatados, ...comunicadosFiltrados]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [criancaId, responsavelId]);

  async function ocultar(aviso: any) {
    if (!responsavelId) return;
    setOcultando(true);
    const tipo = aviso._tipo === "mural" ? "aviso_mural" : "aviso_comunicado";
    const { error } = await ocultarRegistro(supabase2, responsavelId, tipo, aviso.id);
    setOcultando(false);
    if (!error) {
      setAvisos(prev => prev.filter(a => a.id !== aviso.id));
      setDetalhe(null);
    }
  }

  const porMes = useMemo(() => {
    const mapa = new Map<string, any[]>();
    avisos.forEach(a => {
      const chave = a.created_at?.slice(0, 7) || "desconhecido";
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(a);
    });
    return Array.from(mapa.entries());
  }, [avisos]);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (avisos.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📢</span>
      <p className="text-slate-400 text-sm mt-3">Nenhum aviso no momento.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{avisos.length} aviso{avisos.length !== 1 ? "s" : ""} no total</p>

      {porMes.map(([mes, items]) => (
        <div key={mes} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button onClick={() => toggle(mes)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-base flex-shrink-0">📢</div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm capitalize">{labelMes(mes)}</p>
                <p className="text-xs text-slate-400">{items.length} aviso{items.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <span className={`text-slate-400 text-lg transition-transform duration-200 ${abertos.has(mes) ? "rotate-90" : ""}`}>›</span>
          </button>

          {abertos.has(mes) && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {items.map(a => (
                <div key={a.id} onClick={() => setDetalhe(a)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                    {a.conteudo && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.conteudo}</p>}
                    <p className="text-xs text-slate-300 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <span className="text-slate-300 text-lg flex-shrink-0">›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{detalhe.titulo}</p>
                <p className="text-amber-100 text-xs mt-0.5">
                  {new Date(detalhe.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setDetalhe(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {detalhe.conteudo && <p className="text-sm text-slate-700 leading-relaxed">{detalhe.conteudo}</p>}
              <button onClick={() => setDetalhe(null)}
                className="w-full h-11 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition">
                Fechar
              </button>
              <button onClick={() => ocultar(detalhe)} disabled={ocultando}
                className="w-full text-center text-xs text-slate-300 hover:text-red-400 transition disabled:opacity-50">
                {ocultando ? "Removendo..." : "Remover da minha visualização"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA MOMENTOS
// =============================================
function AbaMomentos({ criancaId, responsavelId }: { criancaId: string; responsavelId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [momentos, setMomentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [momentoAberto, setMomentoAberto] = useState<any | null>(null);
  const [ocultando, setOcultando] = useState(false);
  const { abertos, toggle } = useMesesAbertos();

  const carregar = async () => {
    setLoading(true);
    const [{ data }, idsOcultos] = await Promise.all([
      supabase2.from("portal_momentos")
        .select("*").or(`crianca_id.eq.${criancaId},crianca_id.is.null`).order("created_at", { ascending: false }),
      carregarOcultos(supabase2, responsavelId, "momento"),
    ]);
    setMomentos((data || []).filter((m: any) => !idsOcultos.has(m.id)));
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [criancaId, responsavelId]);

  async function ocultar(momentoId: string) {
    if (!responsavelId) return;
    setOcultando(true);
    const { error } = await ocultarRegistro(supabase2, responsavelId, "momento", momentoId);
    setOcultando(false);
    if (!error) {
      setMomentos(prev => prev.filter(m => m.id !== momentoId));
      setMomentoAberto(null);
    }
  }

  const porMes = useMemo(() => {
    const mapa = new Map<string, any[]>();
    momentos.forEach(m => {
      const chave = m.created_at?.slice(0, 7) || "desconhecido";
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(m);
    });
    return Array.from(mapa.entries());
  }, [momentos]);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (momentos.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📸</span>
      <p className="text-slate-400 text-sm mt-3">Nenhuma foto compartilhada ainda.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{momentos.length} foto{momentos.length !== 1 ? "s" : ""} no total</p>

      {porMes.map(([mes, items]) => (
        <div key={mes} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button onClick={() => toggle(mes)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-base flex-shrink-0">📷</div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm capitalize">{labelMes(mes)}</p>
                <p className="text-xs text-slate-400">{items.length} foto{items.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <span className={`text-slate-400 text-lg transition-transform duration-200 ${abertos.has(mes) ? "rotate-90" : ""}`}>›</span>
          </button>

          {abertos.has(mes) && (
            <div className="border-t border-slate-100 p-3">
              <div className="grid grid-cols-2 gap-2">
                {items.map(m => (
                  <div key={m.id} onClick={() => setMomentoAberto(m)}
                    className="rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition border border-slate-100">
                    <img src={m.imagem_url} alt="Momento" className="w-full h-36 object-cover"/>
                    <div className="p-2 bg-white">
                      {m.crianca_id === null && <p className="text-[10px] font-semibold text-amber-600 mb-0.5">📢 Todas as famílias</p>}
                      {m.descricao && <p className="text-xs text-slate-600 truncate">{m.descricao}</p>}
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {momentoAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setMomentoAberto(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-violet-500 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">
                  {new Date(momentoAberto.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                {momentoAberto.crianca_id === null && <p className="text-violet-100 text-xs mt-0.5">📢 Todas as famílias</p>}
              </div>
              <button onClick={() => setMomentoAberto(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 bg-slate-100">
              <img src={momentoAberto.imagem_url} alt="Momento" className="w-full max-h-[55vh] object-contain bg-black"/>
              {momentoAberto.descricao && <p className="text-sm text-slate-700 p-4">{momentoAberto.descricao}</p>}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-white space-y-2">
              <button onClick={() => setMomentoAberto(null)}
                className="w-full h-11 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition">
                Fechar
              </button>
              <button onClick={() => ocultar(momentoAberto.id)} disabled={ocultando}
                className="w-full text-center text-xs text-slate-300 hover:text-red-400 transition disabled:opacity-50">
                {ocultando ? "Removendo..." : "Remover da minha visualização"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA EVOLUÇÃO
// =============================================
function AbaEvolucao({ criancaId, responsavelId }: { criancaId: string; responsavelId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [ocultando, setOcultando] = useState(false);
  const { abertos, toggle } = useMesesAbertos();

  const carregar = async () => {
    setLoading(true);
    const [{ data }, idsOcultos] = await Promise.all([
      supabase2.from("portal_evolucao")
        .select("*").eq("crianca_id", criancaId).order("created_at", { ascending: false }),
      carregarOcultos(supabase2, responsavelId, "evolucao"),
    ]);
    setEvolucoes((data || []).filter((e: any) => !idsOcultos.has(e.id)));
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [criancaId, responsavelId]);

  async function ocultar(evolucaoId: string) {
    if (!responsavelId) return;
    setOcultando(true);
    const { error } = await ocultarRegistro(supabase2, responsavelId, "evolucao", evolucaoId);
    setOcultando(false);
    if (!error) {
      setEvolucoes(prev => prev.filter(e => e.id !== evolucaoId));
      setDetalhe(null);
    }
  }

  const porMes = useMemo(() => {
    const mapa = new Map<string, any[]>();
    evolucoes.forEach(e => {
      const chave = e.created_at?.slice(0, 7) || "desconhecido";
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(e);
    });
    return Array.from(mapa.entries());
  }, [evolucoes]);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (evolucoes.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📊</span>
      <p className="text-slate-400 text-sm mt-3">Nenhum registro de evolução ainda.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{evolucoes.length} registro{evolucoes.length !== 1 ? "s" : ""} no total</p>

      {porMes.map(([mes, items]) => (
        <div key={mes} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button onClick={() => toggle(mes)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-base flex-shrink-0">🌱</div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm capitalize">{labelMes(mes)}</p>
                <p className="text-xs text-slate-400">{items.length} registro{items.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <span className={`text-slate-400 text-lg transition-transform duration-200 ${abertos.has(mes) ? "rotate-90" : ""}`}>›</span>
          </button>

          {abertos.has(mes) && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {items.map(e => (
                <div key={e.id} onClick={() => setDetalhe(e)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{e.titulo}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{e.conteudo}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <span className="text-slate-300 text-lg flex-shrink-0">›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-emerald-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="font-bold text-white text-sm">{detalhe.titulo}</p>
                <p className="text-emerald-100 text-xs mt-0.5">
                  {new Date(detalhe.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setDetalhe(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              <p className="text-sm text-slate-700 leading-relaxed">{detalhe.conteudo}</p>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 space-y-2">
              <button onClick={() => setDetalhe(null)}
                className="w-full h-11 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition">
                Fechar
              </button>
              <button onClick={() => ocultar(detalhe.id)} disabled={ocultando}
                className="w-full text-center text-xs text-slate-300 hover:text-red-400 transition disabled:opacity-50">
                {ocultando ? "Removendo..." : "Remover da minha visualização"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}