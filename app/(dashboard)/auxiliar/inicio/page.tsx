"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { hojeLocal, primeiroNome } from "@/lib/dataUtils";

// Tela inicial da Aux. Administrativa: resumo do dia antes de abrir cada
// módulo. Grade de 4 colunas com cartões da mesma altura por linha (o
// conteúdo rola por dentro) — pedido explícito da ADM pra nada ficar
// "fora de geometria".

type ItemEscala = {
  id: string; horario: string; crianca: string; servico?: string | null;
  profissional_nome?: string | null; local?: string | null;
  trocado: boolean; cancelado: boolean;
};
type Compromisso = { id: string; hora: string | null; hora_fim: string | null; tipo: string; titulo: string; status: string };
type Pendencia = { id: string; nivel: "urgente" | "atencao" | "info"; titulo: string; detalhe: string; href: string; acao: string };
type Aviso = { id: string; titulo: string; created_at: string; aniversario: boolean | null; fixado: boolean | null };

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// Mesma divisão da tela Agenda Simone: atendimento/supervisão/reunião são da
// clínica; o resto (espiritual, atividade física, médico, salão…) é pessoal.
const TIPOS_PROFISSIONAIS = ["supervisao", "reuniao"];
const ehProfissional = (tipo: string) => tipo.startsWith("atend_") || TIPOS_PROFISSIONAIS.includes(tipo);
const EMOJI_TIPO: Record<string, string> = {
  supervisao: "🔎", reuniao: "👥", espiritual: "✝️", atividade_fisica: "🏃‍♀️", treino: "🏃‍♀️",
  medico: "🩺", salao: "💇‍♀️", pet: "🐾", feriado: "🎉",
};
const emojiTipo = (tipo: string) => (tipo.startsWith("atend_") ? "🏥" : EMOJI_TIPO[tipo] || "📋");

const LOCAIS = ["Clínica", "Escola", "Casa"] as const;

function minutos(horario: string | null | undefined, parte: 0 | 1 = 0): number {
  const achados = (horario || "").match(/\d{1,2}:\d{2}/g);
  const h = achados?.[parte] ?? achados?.[0];
  if (!h) return 99999;
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

function saudacaoPorHora() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function InicioAuxAdmPage() {
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [escala, setEscala] = useState<ItemEscala[]>([]);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [criancasAtivas, setCriancasAtivas] = useState(0);
  const [escolas, setEscolas] = useState(0);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [filtroLocal, setFiltroLocal] = useState<string>("Todos");
  const [agoraMin, setAgoraMin] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });

  useEffect(() => {
    const t = setInterval(() => { const d = new Date(); setAgoraMin(d.getHours() * 60 + d.getMinutes()); }, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function carregar() {
      const hoje = hojeLocal();
      const diaHoje = DIAS_SEMANA[(new Date().getDay() + 6) % 7];

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: us } = await supabase.from("usuarios").select("nome").ilike("email", user.email).maybeSingle();
        let n = us?.nome as string | undefined;
        if (!n) {
          const { data: at } = await supabase.from("atendentes").select("nome").ilike("email", user.email).maybeSingle();
          n = at?.nome as string | undefined;
        }
        setNome(n ? primeiroNome(n) : "");
      }

      const [
        { data: slots }, { data: excecoes }, { data: pauta },
        { count: totalCriancas }, { count: totalEscolas },
        { data: defeitos }, { data: pautaAtrasada }, { data: mural },
      ] = await Promise.all([
        supabase.from("escala").select("id, horario, crianca, servico, profissional_nome, profissional_id, local").eq("dia", diaHoje),
        supabase.from("escala_excecoes").select("*").eq("data", hoje),
        supabase.from("pauta_diretora").select("id, hora, hora_fim, tipo, titulo, status").eq("data", hoje).order("hora"),
        supabase.from("criancas").select("*", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("escolas").select("*", { count: "exact", head: true }),
        supabase.from("manutencoes_equipamentos").select("id, defeito_relatado, created_at, patrimonio(nome, numero_tombamento, local)")
          .in("status", ["aberto", "em_analise", "em_conserto"]).order("created_at"),
        supabase.from("pauta_diretora").select("id").eq("status", "pendente").lt("data", hoje),
        supabase.from("mural").select("id, titulo, created_at, aniversario, fixado").order("created_at", { ascending: false }).limit(5),
      ]);

      // Escala do dia = molde semanal + trocas/cancelamentos daquela data
      // (mesma regra da tela Escala e do painel da Gestão). Aqui os
      // cancelados continuam na lista, riscados — a auxiliar precisa ver.
      const excPorSlot: Record<string, any> = {};
      const avulsas: any[] = [];
      (excecoes || []).forEach((e: any) => (e.escala_id ? (excPorSlot[e.escala_id] = e) : avulsas.push(e)));
      const itens: ItemEscala[] = [
        ...(slots || []).map((s: any) => {
          const e = excPorSlot[s.id];
          return {
            id: s.id,
            horario: e?.horario ?? s.horario,
            crianca: e?.crianca ?? s.crianca,
            servico: e?.servico ?? s.servico,
            profissional_nome: e?.profissional_nome ?? s.profissional_nome,
            local: e?.local ?? s.local,
            trocado: !!e && !e.cancelado,
            cancelado: !!e?.cancelado,
          };
        }),
        ...avulsas.filter((e) => !e.cancelado).map((e: any) => ({
          id: e.id, horario: e.horario || "", crianca: e.crianca || "", servico: e.servico,
          profissional_nome: e.profissional_nome, local: e.local, trocado: true, cancelado: false,
        })),
      ].sort((a, b) => minutos(a.horario) - minutos(b.horario));
      setEscala(itens);
      setCompromissos((pauta || []) as Compromisso[]);
      setCriancasAtivas(totalCriancas || 0);
      setEscolas(totalEscolas || 0);
      setAvisos((mural || []) as Aviso[]);

      const pend: Pendencia[] = [];
      itens.filter((i) => !i.cancelado && !i.profissional_nome?.trim()).forEach((i) =>
        pend.push({ id: `sem-${i.id}`, nivel: "urgente", titulo: `Atendimento das ${i.horario.split(/\s/)[0]} sem profissional`,
          detalhe: `${i.crianca}${i.servico ? ` · ${i.servico}` : ""}`, href: "/escala", acao: "Resolver" }));
      (defeitos || []).forEach((d: any) => {
        const bem = Array.isArray(d.patrimonio) ? d.patrimonio[0] : d.patrimonio;
        const dias = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86_400_000);
        pend.push({ id: `def-${d.id}`, nivel: "atencao",
          titulo: `Defeito reportado: ${bem?.nome || "equipamento"}${bem?.numero_tombamento ? ` (T-${String(bem.numero_tombamento).padStart(4, "0")})` : ""}`,
          detalhe: `${bem?.local ? `${bem.local} · ` : ""}aberto ${dias === 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`}`,
          href: "/adm/patrimonio", acao: "Ver" });
      });
      if ((pautaAtrasada || []).length > 0) {
        const n = pautaAtrasada!.length;
        pend.push({ id: "pauta-atrasada", nivel: "atencao",
          titulo: `${n} compromisso${n > 1 ? "s" : ""} da Simone sem conclusão`,
          detalhe: "Dias anteriores ainda marcados como pendentes", href: "/auxiliar/pauta", acao: "Atualizar" });
      }
      const mudancas = (excecoes || []).length;
      if (mudancas > 0) {
        pend.push({ id: "mudancas", nivel: "info",
          titulo: `${mudancas} mudança${mudancas > 1 ? "s" : ""} na escala de hoje`,
          detalhe: "Trocas ou cancelamentos só desta data", href: "/escala", acao: "Ver" });
      }
      setPendencias(pend);
      setLoading(false);
    }
    carregar();
  }, []);

  const ativos = escala.filter((i) => !i.cancelado);
  const porLocal = (l: string) => ativos.filter((i) => (i.local || "Clínica") === l).length;
  const escalaFiltrada = filtroLocal === "Todos" ? escala : escala.filter((i) => (i.local || "Clínica") === filtroLocal);
  const profissionais = compromissos.filter((c) => ehProfissional(c.tipo));
  const pessoais = compromissos.filter((c) => !ehProfissional(c.tipo));
  const urgentes = pendencias.filter((p) => p.nivel === "urgente").length;
  const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-3 relative">

      {/* SAUDAÇÃO */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 rounded-2xl px-6 py-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">{saudacaoPorHora()}{nome ? `, ${nome}` : ""}!</h1>
          <p className="text-sm text-blue-200 mt-0.5 first-letter:uppercase">{dataExtenso} · resumo do que precisa da sua atenção hoje</p>
        </div>
        <span className="flex items-center gap-2 text-xs font-semibold bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Ao vivo
        </span>
      </div>

      {/* NÚMEROS DO DIA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Atendimentos hoje", valor: ativos.length, sub: LOCAIS.map((l) => `${porLocal(l)} ${l.toLowerCase()}`).join(" · ") },
          { label: "Compromissos da Simone", valor: compromissos.length, sub: `${profissionais.length} profissionais · ${pessoais.length} pessoais` },
          { label: "Crianças ativas", valor: criancasAtivas, sub: `${escolas} escola${escolas === 1 ? "" : "s"} cadastrada${escolas === 1 ? "" : "s"}` },
          { label: "Pendências", valor: pendencias.length, sub: urgentes > 0 ? `${urgentes} urgente${urgentes > 1 ? "s" : ""}` : "nada urgente", alerta: urgentes > 0 },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="text-3xl font-extrabold text-blue-900 tabular-nums leading-tight">{k.valor}</p>
            <p className={`text-xs truncate ${k.alerta ? "text-rose-600 font-semibold" : "text-slate-500"}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      <Divisor label="Hoje" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* AGENDA DE HOJE (ESCALA) */}
        <Painel titulo="Agenda de hoje" sub="Escala do dia, com as trocas já aplicadas" href="/escala" linkLabel="Abrir escala →" altura="md:h-[400px]"
          topo={
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {["Todos", ...LOCAIS].map((l) => {
                const n = l === "Todos" ? ativos.length : porLocal(l);
                const ativo = filtroLocal === l;
                return (
                  <button key={l} type="button" onClick={() => setFiltroLocal(l)} aria-pressed={ativo}
                    className={`text-xs font-bold rounded-full px-3 py-1 border transition ${ativo ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                    {l} · {n}
                  </button>
                );
              })}
            </div>
          }>
          {escalaFiltrada.length === 0 ? (
            <Vazio texto={filtroLocal === "Todos" ? "Nenhum atendimento na escala de hoje." : `Nenhum atendimento em ${filtroLocal.toLowerCase()} hoje.`} />
          ) : (
            <ul className="py-1">
              {escalaFiltrada.map((i) => {
                const ini = minutos(i.horario, 0), fim = minutos(i.horario, 1);
                const agora = !i.cancelado && agoraMin >= ini && agoraMin < (fim === ini ? ini + 60 : fim);
                const passou = !i.cancelado && agoraMin >= (fim === ini ? ini + 60 : fim);
                const [hIni, hFim] = i.horario.split(/\s*[–-]\s*/);
                return (
                  <li key={i.id} className={`grid grid-cols-[56px_1fr] sm:grid-cols-[56px_1fr_auto] gap-x-3 gap-y-1 items-center px-4 py-2.5 border-b border-slate-100 last:border-0 ${agora ? "bg-gradient-to-r from-blue-50 to-white" : ""}`}>
                    <span className={`text-[13px] font-extrabold tabular-nums ${i.cancelado ? "text-slate-400 line-through" : "text-blue-900"}`}>
                      {hIni}
                      {hFim && <span className="block text-[11px] font-medium text-slate-400 no-underline">até {hFim}</span>}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-bold truncate ${i.cancelado ? "text-slate-400 line-through" : "text-slate-800"}`}>{i.crianca}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[i.servico?.trim(), i.profissional_nome?.trim(), i.local || "Clínica"].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className={`col-start-2 sm:col-start-auto justify-self-start sm:justify-self-end text-[11px] font-bold rounded-full px-2.5 py-0.5 whitespace-nowrap
                      ${i.cancelado ? "bg-slate-100 text-slate-500"
                        : !i.profissional_nome?.trim() ? "bg-rose-50 text-rose-600"
                        : agora ? "bg-blue-100 text-blue-800"
                        : i.trocado ? "bg-amber-50 text-amber-700"
                        : passou ? "bg-teal-50 text-teal-700"
                        : "bg-blue-50 text-blue-700"}`}>
                      {i.cancelado ? "Cancelado hoje" : !i.profissional_nome?.trim() ? "Sem profissional" : agora ? "Agora" : i.trocado ? "Trocado hoje" : passou ? "Concluído" : "A seguir"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>

        {/* PRECISA DE VOCÊ */}
        <Painel titulo="Precisa de você" sub="Do mais urgente ao menos urgente" altura="md:h-[400px]">
          {pendencias.length === 0 ? (
            <Vazio texto="Tudo em dia por aqui. ✨" />
          ) : (
            <ul className="py-1">
              {[...pendencias].sort((a, b) => ordemNivel(a.nivel) - ordemNivel(b.nivel)).map((p) => (
                <li key={p.id} className="grid grid-cols-[10px_1fr_auto] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.nivel === "urgente" ? "bg-rose-600" : p.nivel === "atencao" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-800">{p.titulo}</p>
                    <p className="text-xs text-slate-500 truncate">{p.detalhe}</p>
                  </div>
                  <Link href={p.href} className="text-xs font-bold text-blue-700 hover:underline whitespace-nowrap">{p.acao}</Link>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      {/* AGENDAS DA SIMONE + MURAL — profissional ocupa metade, pessoal e mural um quarto cada */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Painel className="md:col-span-2" titulo="Agenda profissional" icone="🏥" iconeBg="bg-blue-50"
          sub={`Simone · hoje · ${profissionais.length} compromisso${profissionais.length === 1 ? "" : "s"}`}
          href="/auxiliar/pauta" linkLabel="Abrir →" altura="md:h-[290px]">
          <ListaCompromissos itens={profissionais} vazio="Nenhum compromisso profissional hoje." />
        </Painel>
        <Painel titulo="Agenda pessoal" icone="🤍" iconeBg="bg-rose-50"
          sub={`Simone · hoje · ${pessoais.length}`} href="/auxiliar/pauta" linkLabel="Abrir" altura="md:h-[290px]">
          <ListaCompromissos itens={pessoais} vazio="Nada pessoal marcado hoje." pessoal />
        </Painel>
        <Painel titulo="Mural" sub="Últimos avisos" href="/mural" linkLabel="Abrir" altura="md:h-[290px]">
          {avisos.length === 0 ? (
            <Vazio texto="Nenhum aviso no mural." />
          ) : (
            <ul className="px-4 py-3 space-y-2.5">
              {avisos.map((a) => (
                <li key={a.id} className="grid grid-cols-[22px_1fr] gap-2 items-baseline">
                  <span>{a.aniversario ? "🎂" : a.fixado ? "📌" : "📢"}</span>
                  <span className="text-[13px] font-semibold text-slate-800 min-w-0">
                    {a.titulo}
                    <span className="block text-xs font-medium text-slate-500">{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      <Divisor label="Atalhos" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/auxiliar/pauta", label: "Agenda da Simone", icon: "📆" },
          { href: "/escala", label: "Escala", icon: "📅" },
          { href: "/adm/criancas", label: "Crianças", icon: "👶" },
          { href: "/ocorrencias", label: "Ocorrência diária", icon: "📓" },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className="group bg-white rounded-2xl shadow-sm border border-transparent hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 p-3 flex items-center gap-3 text-[13px] font-bold text-slate-800 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-base group-hover:scale-110 transition-transform flex-shrink-0">{a.icon}</span>
            <span className="truncate">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ordemNivel(n: Pendencia["nivel"]) {
  return n === "urgente" ? 0 : n === "atencao" ? 1 : 2;
}

function Divisor({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-2">
      <span className="w-2 h-2 rounded-full bg-blue-700" />
      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900">{label}</span>
      <span className="flex-1 h-px bg-slate-300" />
    </div>
  );
}

function Painel({ titulo, sub, href, linkLabel, altura, topo, icone, iconeBg, className = "", children }: {
  titulo: string; sub?: string; href?: string; linkLabel?: string; altura: string;
  topo?: React.ReactNode; icone?: string; iconeBg?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col min-w-0 max-h-[420px] md:max-h-none ${altura} ${className}`}>
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100">
        <div className="min-w-0">
          {/* Título numa linha só: se quebrar, o cabeçalho fica mais alto que o do cartão vizinho */}
          <h2 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2 whitespace-nowrap">
            {icone && <span className={`w-6 h-6 rounded-lg ${iconeBg} flex items-center justify-center text-[13px] flex-shrink-0`}>{icone}</span>}
            {titulo}
          </h2>
          {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
        </div>
        {href && <Link href={href} className="text-xs font-bold text-blue-700 hover:underline whitespace-nowrap flex-shrink-0">{linkLabel}</Link>}
      </header>
      {topo}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}

function ListaCompromissos({ itens, vazio, pessoal = false }: { itens: Compromisso[]; vazio: string; pessoal?: boolean }) {
  if (itens.length === 0) return <Vazio texto={vazio} />;
  return (
    <ul className="px-4 py-3 space-y-2.5">
      {itens.map((c) => (
        <li key={c.id} className="grid grid-cols-[46px_1fr] gap-2.5 items-baseline">
          <span className={`text-xs font-extrabold tabular-nums ${pessoal ? "text-rose-800" : "text-blue-900"}`}>{c.hora?.slice(0, 5) || "—"}</span>
          <span className="text-[13px] font-semibold text-slate-800 min-w-0">
            {emojiTipo(c.tipo)} {c.titulo}
            <span className="block text-xs font-medium text-slate-500">
              {[c.hora_fim ? `até ${c.hora_fim.slice(0, 5)}` : null,
                c.status === "realizado" ? "concluído" : c.status === "nao_realizado" ? "não realizado" : null].filter(Boolean).join(" · ") || "agendado"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <div className="h-full min-h-[120px] flex items-center justify-center px-6 text-center text-sm text-slate-400">{texto}</div>;
}
