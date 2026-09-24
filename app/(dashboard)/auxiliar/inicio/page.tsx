"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hojeLocal, primeiroNome } from "@/lib/dataUtils";
import {
  Atalhos, Divisor, FiltroLocal, ListaEscala, ListaMini, ListaPendencias, LOCAIS, Numeros, Painel, Saudacao,
  diaSemanaDe, montarEscalaDoDia, useAgoraMin, type ItemEscala, type Mini, type Pendencia,
} from "@/components/painel-inicio";

// Tela inicial da Aux. Administrativa: resumo do dia antes de abrir cada módulo.

type Compromisso = { id: string; hora: string | null; hora_fim: string | null; tipo: string; titulo: string; status: string };

// Mesma divisão da tela Agenda Simone: atendimento/supervisão/reunião são da
// clínica; o resto (espiritual, atividade física, médico, salão…) é pessoal.
const ehProfissional = (tipo: string) => tipo.startsWith("atend_") || ["supervisao", "reuniao"].includes(tipo);
const EMOJI_TIPO: Record<string, string> = {
  supervisao: "🔎", reuniao: "👥", espiritual: "✝️", atividade_fisica: "🏃‍♀️", treino: "🏃‍♀️",
  medico: "🩺", salao: "💇‍♀️", pet: "🐾", feriado: "🎉",
};
const emojiTipo = (tipo: string) => (tipo.startsWith("atend_") ? "🏥" : EMOJI_TIPO[tipo] || "📋");

function compromissoParaMini(c: Compromisso, pessoal: boolean): Mini {
  const detalhe = [c.hora_fim ? `até ${c.hora_fim.slice(0, 5)}` : null,
    c.status === "realizado" ? "concluído" : c.status === "nao_realizado" ? "não realizado" : null].filter(Boolean).join(" · ");
  return { id: c.id, marca: c.hora?.slice(0, 5) || "—", titulo: `${emojiTipo(c.tipo)} ${c.titulo}`, detalhe: detalhe || "agendado",
    corMarca: pessoal ? "text-rose-800" : undefined };
}

export default function InicioAuxAdmPage() {
  const agoraMin = useAgoraMin();
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [escala, setEscala] = useState<ItemEscala[]>([]);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [criancasAtivas, setCriancasAtivas] = useState(0);
  const [escolas, setEscolas] = useState(0);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [avisos, setAvisos] = useState<Mini[]>([]);
  const [filtroLocal, setFiltroLocal] = useState("Todos");

  useEffect(() => {
    async function carregar() {
      const hoje = hojeLocal();
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
        supabase.from("escala").select("id, horario, crianca, servico, profissional_nome, profissional_id, local").eq("dia", diaSemanaDe(new Date())),
        supabase.from("escala_excecoes").select("*").eq("data", hoje),
        supabase.from("pauta_diretora").select("id, hora, hora_fim, tipo, titulo, status").eq("data", hoje).order("hora"),
        supabase.from("criancas").select("*", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("escolas").select("*", { count: "exact", head: true }),
        supabase.from("manutencoes_equipamentos").select("id, created_at, patrimonio(nome, numero_tombamento, local)")
          .in("status", ["aberto", "em_analise", "em_conserto"]).order("created_at"),
        supabase.from("pauta_diretora").select("id").eq("status", "pendente").lt("data", hoje),
        supabase.from("mural").select("id, titulo, created_at, aniversario, fixado").order("created_at", { ascending: false }).limit(5),
      ]);

      const itens = montarEscalaDoDia(slots || [], excecoes || []);
      setEscala(itens);
      setCompromissos((pauta || []) as Compromisso[]);
      setCriancasAtivas(totalCriancas || 0);
      setEscolas(totalEscolas || 0);
      setAvisos((mural || []).map((a: any) => ({
        id: a.id, marca: a.aniversario ? "🎂" : a.fixado ? "📌" : "📢", titulo: a.titulo,
        detalhe: new Date(a.created_at).toLocaleDateString("pt-BR"),
      })));

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
      const atrasados = (pautaAtrasada || []).length;
      if (atrasados > 0) {
        pend.push({ id: "pauta-atrasada", nivel: "atencao",
          titulo: `${atrasados} compromisso${atrasados > 1 ? "s" : ""} da Simone sem conclusão`,
          detalhe: "Dias anteriores ainda marcados como pendentes", href: "/auxiliar/pauta", acao: "Atualizar" });
      }
      const mudancas = (excecoes || []).length;
      if (mudancas > 0) {
        pend.push({ id: "mudancas", nivel: "info", titulo: `${mudancas} mudança${mudancas > 1 ? "s" : ""} na escala de hoje`,
          detalhe: "Trocas ou cancelamentos só desta data", href: "/escala", acao: "Ver" });
      }
      setPendencias(pend);
      setLoading(false);
    }
    carregar();
  }, []);

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>;

  const ativos = escala.filter((i) => !i.cancelado);
  const porLocal = (l: string) => (l === "Todos" ? ativos.length : ativos.filter((i) => (i.local || "Clínica") === l).length);
  const escalaFiltrada = filtroLocal === "Todos" ? escala : escala.filter((i) => (i.local || "Clínica") === filtroLocal);
  const profissionais = compromissos.filter((c) => ehProfissional(c.tipo));
  const pessoais = compromissos.filter((c) => !ehProfissional(c.tipo));
  const urgentes = pendencias.filter((p) => p.nivel === "urgente").length;
  const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-6xl mx-auto space-y-3 relative">
      <Saudacao nome={nome} subtitulo={`${dataExtenso} · resumo do que precisa da sua atenção hoje`} />

      <Numeros itens={[
        { label: "Atendimentos hoje", valor: ativos.length, sub: LOCAIS.map((l) => `${porLocal(l)} ${l.toLowerCase()}`).join(" · ") },
        { label: "Compromissos da Simone", valor: compromissos.length, sub: `${profissionais.length} profissionais · ${pessoais.length} pessoais` },
        { label: "Crianças ativas", valor: criancasAtivas, sub: `${escolas} escola${escolas === 1 ? "" : "s"} cadastrada${escolas === 1 ? "" : "s"}` },
        { label: "Pendências", valor: pendencias.length, sub: urgentes > 0 ? `${urgentes} urgente${urgentes > 1 ? "s" : ""}` : "nada urgente", alerta: urgentes > 0 },
      ]} />

      <Divisor label="Hoje" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Painel tetoCelular={false} titulo="Agenda de hoje" sub="Escala do dia, com as trocas já aplicadas" href="/escala" linkLabel="Abrir escala →" altura="md:h-[400px]"
          topo={<FiltroLocal valor={filtroLocal} onChange={setFiltroLocal} contar={porLocal} />}>
          <ListaEscala itens={escalaFiltrada} agoraMin={agoraMin} hrefTodos="/escala"
            vazio={filtroLocal === "Todos" ? "Nenhum atendimento na escala de hoje." : `Nenhum atendimento em ${filtroLocal.toLowerCase()} hoje.`} />
        </Painel>
        <Painel titulo="Precisa de você" sub="Do mais urgente ao menos urgente" altura="md:h-[400px]">
          <ListaPendencias itens={pendencias} />
        </Painel>
      </div>

      {/* Profissional ocupa metade; pessoal e mural um quarto cada */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Painel className="md:col-span-2" titulo="Agenda profissional" icone="🏥" iconeBg="bg-blue-50"
          sub={`Simone · hoje · ${profissionais.length} compromisso${profissionais.length === 1 ? "" : "s"}`}
          href="/auxiliar/pauta" linkLabel="Abrir →" altura="md:h-[290px]">
          <ListaMini itens={profissionais.map((c) => compromissoParaMini(c, false))} vazio="Nenhum compromisso profissional hoje." />
        </Painel>
        <Painel titulo="Agenda pessoal" icone="🤍" iconeBg="bg-rose-50" sub={`Simone · hoje · ${pessoais.length}`}
          href="/auxiliar/pauta" linkLabel="Abrir" altura="md:h-[290px]">
          <ListaMini itens={pessoais.map((c) => compromissoParaMini(c, true))} vazio="Nada pessoal marcado hoje." />
        </Painel>
        <Painel titulo="Mural" sub="Últimos avisos" href="/mural" linkLabel="Abrir" altura="md:h-[290px]">
          <ListaMini itens={avisos} vazio="Nenhum aviso no mural." />
        </Painel>
      </div>

      <Divisor label="Atalhos" />
      <Atalhos itens={[
        { href: "/auxiliar/pauta", label: "Agenda da Simone", icon: "📆" },
        { href: "/escala", label: "Escala", icon: "📅" },
        { href: "/adm/criancas", label: "Crianças", icon: "👶" },
        { href: "/ocorrencias", label: "Ocorrência diária", icon: "📓" },
      ]} />
    </div>
  );
}
