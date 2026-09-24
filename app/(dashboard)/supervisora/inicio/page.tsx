"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hojeLocal, primeiroNome } from "@/lib/dataUtils";
import {
  Atalhos, Divisor, FiltroLocal, ListaEscala, ListaMini, ListaPendencias, Numeros, Painel, Saudacao,
  diaSemanaDe, montarEscalaDoDia, situacao, useAgoraMin, type ItemEscala, type Mini, type Pendencia,
} from "@/components/painel-inicio";

// Tela inicial da Supervisora: a equipe no dia, o que falta acompanhar e a
// agenda da Simone. Antes o login caía em Comunicados (ou Materiais Adaptados).

const ehProfissional = (tipo: string) => tipo.startsWith("atend_") || ["supervisao", "reuniao"].includes(tipo);
const EMOJI_TIPO: Record<string, string> = { supervisao: "🔎", reuniao: "👥" };
const STATUS_MATERIAL: Record<string, string> = { rascunho: "Rascunho", em_revisao: "Aguardando revisão", aprovado: "Aprovado" };

export default function InicioSupervisoraPage() {
  const agoraMin = useAgoraMin();
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [contataFamilia, setContataFamilia] = useState(true);
  const [veAgendaSimone, setVeAgendaSimone] = useState(true);
  const [escala, setEscala] = useState<ItemEscala[]>([]);
  const [abcHoje, setAbcHoje] = useState(0);
  const [comunicadosSemana, setComunicadosSemana] = useState(0);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [agendaSimone, setAgendaSimone] = useState<Mini[]>([]);
  const [ultimosAbc, setUltimosAbc] = useState<Mini[]>([]);
  const [materiais, setMateriais] = useState<Mini[]>([]);
  const [avisos, setAvisos] = useState<Mini[]>([]);
  const [filtroLocal, setFiltroLocal] = useState("Todos");

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }
      const hoje = hojeLocal();

      // Supervisora pode estar em usuarios ou em atendentes; as chaves de acesso
      // (contata família / agenda da Simone) seguem as mesmas regras do menu e do proxy.
      const [{ data: us }, { data: at }] = await Promise.all([
        supabase.from("usuarios").select("nome, contata_familia").ilike("email", user.email).maybeSingle(),
        supabase.from("atendentes").select("nome, contata_familia, acesso_pauta_diretora").ilike("email", user.email).maybeSingle(),
      ]);
      setNome(primeiroNome(us?.nome || at?.nome || ""));
      const contata = (us ?? at)?.contata_familia !== false;
      const agendaLiberada = at?.acesso_pauta_diretora !== false;
      setContataFamilia(contata);
      setVeAgendaSimone(agendaLiberada);

      const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
      const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const [
        { data: slots }, { data: excecoes }, { data: abc }, { count: comunicados },
        { data: pauta }, { data: mats }, { data: mural },
      ] = await Promise.all([
        supabase.from("escala").select("id, horario, crianca, servico, profissional_nome, profissional_id, local").eq("dia", diaSemanaDe(new Date())),
        supabase.from("escala_excecoes").select("*").eq("data", hoje),
        supabase.from("prontuarios").select("id, created_at, autor_nome, criancas(nome)").eq("tipo", "relatorio_supervisora")
          .gte("created_at", seteDiasAtras.toISOString()).order("created_at", { ascending: false }),
        supabase.from("portal_comunicados").select("*", { count: "exact", head: true }).gte("created_at", seteDiasAtras.toISOString()),
        agendaLiberada
          ? supabase.from("pauta_diretora").select("id, hora, hora_fim, tipo, titulo, status").eq("data", hoje).order("hora")
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("materiais_adaptados").select("id, titulo_livro, status, updated_at, criancas(nome)")
          .in("status", ["rascunho", "em_revisao"]).order("updated_at", { ascending: false }),
        supabase.from("mural").select("id, titulo, created_at, aniversario, fixado").order("created_at", { ascending: false }).limit(5),
      ]);

      const itens = montarEscalaDoDia(slots || [], excecoes || []);
      setEscala(itens);
      setAbcHoje((abc || []).filter((r: any) => new Date(r.created_at) >= inicioHoje).length);
      setComunicadosSemana(comunicados || 0);
      setUltimosAbc((abc || []).slice(0, 6).map((r: any) => ({
        id: r.id, marca: new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        titulo: (Array.isArray(r.criancas) ? r.criancas[0] : r.criancas)?.nome || "Registro ABC",
        detalhe: r.autor_nome ? `por ${r.autor_nome}` : undefined,
      })));
      setAgendaSimone((pauta || []).filter((c: any) => ehProfissional(c.tipo)).map((c: any) => ({
        id: c.id, marca: c.hora?.slice(0, 5) || "—",
        titulo: `${c.tipo.startsWith("atend_") ? "🏥" : EMOJI_TIPO[c.tipo] || "📋"} ${c.titulo}`,
        detalhe: [c.hora_fim ? `até ${c.hora_fim.slice(0, 5)}` : null, c.status === "realizado" ? "concluído" : null].filter(Boolean).join(" · ") || "agendado",
      })));
      setMateriais((mats || []).map((m: any) => ({
        id: m.id, marca: m.status === "em_revisao" ? "🔎" : "✏️", titulo: m.titulo_livro || "Material adaptado",
        detalhe: [(Array.isArray(m.criancas) ? m.criancas[0] : m.criancas)?.nome, STATUS_MATERIAL[m.status]].filter(Boolean).join(" · "),
      })));
      setAvisos((mural || []).map((a: any) => ({ id: a.id, marca: a.aniversario ? "🎂" : a.fixado ? "📌" : "📢",
        titulo: a.titulo, detalhe: new Date(a.created_at).toLocaleDateString("pt-BR") })));

      const pend: Pendencia[] = [];
      itens.filter((i) => !i.cancelado && !i.profissional_nome?.trim()).forEach((i) =>
        pend.push({ id: `sem-${i.id}`, nivel: "urgente", titulo: `Atendimento das ${i.horario.split(/\s/)[0]} sem profissional`,
          detalhe: `${i.crianca}${i.servico ? ` · ${i.servico}` : ""}`, href: "/escala", acao: "Resolver" }));
      const emRevisao = (mats || []).filter((m: any) => m.status === "em_revisao").length;
      if (emRevisao > 0) {
        pend.push({ id: "materiais", nivel: "atencao", titulo: `${emRevisao} ${emRevisao > 1 ? "materiais adaptados" : "material adaptado"} aguardando revisão`,
          detalhe: "Enviados pela equipe pra você revisar", href: "/materiais-adaptados", acao: "Revisar" });
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
  const agora = ativos.filter((i) => situacao(i, agoraMin).agora).length;
  const porLocal = (l: string) => (l === "Todos" ? ativos.length : ativos.filter((i) => (i.local || "Clínica") === l).length);
  const escalaFiltrada = filtroLocal === "Todos" ? escala : escala.filter((i) => (i.local || "Clínica") === filtroLocal);
  const profissionaisHoje = new Set(ativos.map((i) => i.profissional_nome?.trim()).filter(Boolean)).size;
  const urgentes = pendencias.filter((p) => p.nivel === "urgente").length;
  const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-6xl mx-auto space-y-3 relative">
      <Saudacao nome={nome} subtitulo={`${dataExtenso} · Supervisão`} />

      <Numeros itens={[
        { label: "Atendimentos hoje", valor: ativos.length, sub: `${profissionaisHoje} profissiona${profissionaisHoje === 1 ? "l" : "is"} · ${agora} agora` },
        { label: "Registros ABC", valor: abcHoje, sub: "feitos hoje" },
        { label: "Comunicados às famílias", valor: comunicadosSemana, sub: "nos últimos 7 dias" },
        { label: "Pendências", valor: pendencias.length, sub: urgentes > 0 ? `${urgentes} urgente${urgentes > 1 ? "s" : ""}` : "nada urgente", alerta: urgentes > 0 },
      ]} />

      <Divisor label="Hoje" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Painel tetoCelular={false} titulo="Equipe em atendimento" sub="Escala de hoje, com as trocas já aplicadas" href="/escala" linkLabel="Escala →" altura="md:h-[400px]"
          topo={<FiltroLocal valor={filtroLocal} onChange={setFiltroLocal} contar={porLocal} />}>
          <ListaEscala itens={escalaFiltrada} agoraMin={agoraMin} hrefTodos="/escala"
            vazio={filtroLocal === "Todos" ? "Nenhum atendimento na escala de hoje." : `Nenhum atendimento em ${filtroLocal.toLowerCase()} hoje.`} />
        </Painel>
        <Painel titulo="Precisa de você" sub="Do mais urgente ao menos urgente" altura="md:h-[400px]">
          <ListaPendencias itens={pendencias} />
        </Painel>
      </div>

      {/* Metade + quarto + quarto, igual aos outros painéis Início */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {veAgendaSimone ? (
          <Painel className="md:col-span-2" titulo="Agenda da Simone" icone="🏥" iconeBg="bg-blue-50"
            sub={`Hoje · ${agendaSimone.length} compromisso${agendaSimone.length === 1 ? "" : "s"} profissiona${agendaSimone.length === 1 ? "l" : "is"}`}
            href="/supervisora/agenda-simone" linkLabel="Abrir →" altura="md:h-[290px]">
            <ListaMini itens={agendaSimone} vazio="Nenhum compromisso profissional da Simone hoje." />
          </Painel>
        ) : (
          <Painel className="md:col-span-2" titulo="Últimos Registros ABC" sub="Da equipe de supervisão, últimos 7 dias"
            href="/supervisora/relatorio" linkLabel="Abrir →" altura="md:h-[290px]">
            <ListaMini itens={ultimosAbc} vazio="Nenhum Registro ABC nos últimos 7 dias." />
          </Painel>
        )}
        <Painel titulo="Materiais adaptados" sub="Em aberto" href="/materiais-adaptados" linkLabel="Abrir" altura="md:h-[290px]">
          <ListaMini itens={materiais} vazio="Nenhum material em aberto." />
        </Painel>
        <Painel titulo="Mural" sub="Últimos avisos" href="/mural" linkLabel="Abrir" altura="md:h-[290px]">
          <ListaMini itens={avisos} vazio="Nenhum aviso no mural." />
        </Painel>
      </div>

      <Divisor label="Atalhos" />
      <Atalhos itens={[
        { href: "/supervisora/relatorio", label: "Registro ABC", icon: "📝" },
        contataFamilia
          ? { href: "/supervisora/comunicados", label: "Comunicados", icon: "📋" }
          : { href: "/materiais-adaptados", label: "Materiais adaptados", icon: "📚" },
        { href: "/escala", label: "Escala", icon: "📅" },
        { href: "/ocorrencias", label: "Ocorrência diária", icon: "📓" },
      ]} />
    </div>
  );
}
