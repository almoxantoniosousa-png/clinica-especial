"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hojeLocal, paraISOLocal, primeiroNome } from "@/lib/dataUtils";
import {
  Atalhos, Divisor, ListaEscala, ListaMini, ListaPendencias, Numeros, Painel, Saudacao,
  diaSemanaDe, mesmoNome, montarEscalaDoDia, normalizarNome, situacao, useAgoraMin,
  type ItemEscala, type Mini, type Pendencia,
} from "@/components/painel-inicio";

// Tela inicial da Especialista: o dia dela, os prontuários que faltam e
// atalhos pro que ela mais faz. Antes o login caía direto em "Minha Escala".

const STATUS_REQ: Record<string, { marca: string; texto: string }> = {
  pendente: { marca: "⏳", texto: "Aguardando análise" },
  em_analise: { marca: "🔎", texto: "Em análise" },
  comprado: { marca: "📦", texto: "Comprado, a caminho" },
  entregue: { marca: "✅", texto: "Entregue" },
  recusado: { marca: "✖️", texto: "Recusado" },
};

// Último dia útil antes de hoje (segunda → sexta anterior)
function ultimoDiaUtil(): Date {
  const d = new Date();
  do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

// data_sessao fica dentro do JSON do prontuário; se faltar, usa a data de criação
function dataDoProntuario(p: any): string {
  try {
    const c = typeof p.conteudo === "string" ? JSON.parse(p.conteudo) : p.conteudo;
    if (c?.data_sessao) return c.data_sessao;
  } catch { /* conteúdo antigo em texto livre */ }
  return paraISOLocal(new Date(p.created_at));
}

export default function InicioEspecialistaPage() {
  const agoraMin = useAgoraMin();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [escalaHoje, setEscalaHoje] = useState<ItemEscala[]>([]);
  const [criancasSemana, setCriancasSemana] = useState(0);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [ultimos, setUltimos] = useState<Mini[]>([]);
  const [requisicoes, setRequisicoes] = useState<Mini[]>([]);
  const [reqAbertas, setReqAbertas] = useState(0);
  const [avisos, setAvisos] = useState<Mini[]>([]);
  const [prontuariosFaltando, setProntuariosFaltando] = useState({ hoje: 0, antes: 0 });

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }
      const { data: eu } = await supabase.from("atendentes").select("id, nome, especialidade").ilike("email", user.email).maybeSingle();
      if (!eu) { setErro("Seu cadastro de especialista não foi encontrado. Fale com a Administração."); setLoading(false); return; }
      setNome(primeiroNome(eu.nome || ""));
      setEspecialidade(eu.especialidade || "");

      const hoje = hojeLocal();
      const diaAnterior = ultimoDiaUtil();
      const anteriorISO = paraISOLocal(diaAnterior);
      const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const [
        { data: minhaSemana }, { data: excHoje }, { data: excAnterior },
        { data: prontuarios }, { data: criancas }, { data: reqs }, { data: mural }, { data: planos },
      ] = await Promise.all([
        supabase.from("escala").select("id, dia, horario, crianca, servico, profissional_nome, profissional_id, local").eq("profissional_id", eu.id),
        supabase.from("escala_excecoes").select("*").eq("data", hoje),
        supabase.from("escala_excecoes").select("*").eq("data", anteriorISO),
        // autor_id = id do login; cadastros antigos podem ter o id de atendentes
        supabase.from("prontuarios").select("id, crianca_id, conteudo, created_at, titulo, tipo, criancas(nome)")
          .in("autor_id", [user.id, eu.id]).gte("created_at", seteDiasAtras.toISOString()).order("created_at", { ascending: false }),
        supabase.from("criancas").select("id, nome").eq("ativo", true),
        supabase.from("requisicoes_compra").select("id, produto, status, created_at").eq("solicitante_id", user.id)
          .order("created_at", { ascending: false }).limit(6),
        supabase.from("mural").select("id, titulo, created_at, aniversario, fixado").order("created_at", { ascending: false }).limit(5),
        supabase.from("planos_terapeuticos").select("id, crianca_id, proxima_revisao, criancas(nome)").eq("ativo", true)
          .not("proxima_revisao", "is", null).order("proxima_revisao"),
      ]);

      const semana = minhaSemana || [];
      const idsMeus = new Set(semana.map((s: any) => s.id));
      // Exceções que tocam os meus horários (ou avulsas atribuídas a mim)
      const minhas = (lista: any[] | null) => (lista || []).filter((e) => idsMeus.has(e.escala_id) || e.profissional_id === eu.id);
      const escalaDe = (dia: string, exc: any[] | null) => montarEscalaDoDia(semana.filter((s: any) => s.dia === dia), minhas(exc))
        // troca que passou o horário pra outra pessoa sai da minha lista
        .filter((i) => !i.profissional_id || i.profissional_id === eu.id);

      const hojeLista = escalaDe(diaSemanaDe(new Date()), excHoje);
      const anteriorLista = escalaDe(diaSemanaDe(diaAnterior), excAnterior);
      setEscalaHoje(hojeLista);
      setCriancasSemana(new Set(semana.map((s: any) => normalizarNome(s.crianca))).size);

      // Prontuário que falta = atendimento já feito sem prontuário da criança naquela data
      const feitos = (prontuarios || []).filter((p: any) => p.tipo === "prontuario");
      const temProntuario = (crianca: string, data: string) => {
        const c = (criancas || []).find((x: any) => mesmoNome(x.nome, crianca));
        return feitos.some((p: any) => dataDoProntuario(p) === data
          && (c ? p.crianca_id === c.id : mesmoNome((Array.isArray(p.criancas) ? p.criancas[0] : p.criancas)?.nome, crianca)));
      };
      const agora = new Date(); const minAgora = agora.getHours() * 60 + agora.getMinutes();
      const faltandoHoje = hojeLista.filter((i) => !i.cancelado && situacao(i, minAgora).passou && !temProntuario(i.crianca, hoje));
      const faltandoAntes = anteriorLista.filter((i) => !i.cancelado && !temProntuario(i.crianca, anteriorISO));
      setProntuariosFaltando({ hoje: faltandoHoje.length, antes: faltandoAntes.length });

      const dataCurta = diaAnterior.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const pend: Pendencia[] = [
        ...faltandoAntes.map((i) => ({ id: `ant-${i.id}`, nivel: "urgente" as const,
          titulo: `Prontuário de ${dataCurta} sem registro`, detalhe: `${i.crianca} · ${i.horario.split(/\s/)[0]}`,
          href: "/especialista/relatorio", acao: "Registrar" })),
        ...faltandoHoje.map((i) => ({ id: `hoje-${i.id}`, nivel: "atencao" as const,
          titulo: "Prontuário de hoje", detalhe: `${i.crianca} · ${i.horario.split(/\s/)[0]} · atendimento já feito`,
          href: "/especialista/relatorio", acao: "Registrar" })),
      ];
      // Plano terapêutico com revisão vencida ou nos próximos 7 dias, só das crianças que eu atendo
      const limite = new Date(); limite.setDate(limite.getDate() + 7);
      const minhasCriancas = semana.map((s: any) => s.crianca);
      (planos || []).forEach((p: any) => {
        const nomeC = (Array.isArray(p.criancas) ? p.criancas[0] : p.criancas)?.nome;
        if (!minhasCriancas.some((n: string) => mesmoNome(n, nomeC))) return;
        const rev = new Date(p.proxima_revisao + "T12:00:00");
        if (rev > limite) return;
        pend.push({ id: `plano-${p.id}`, nivel: rev < new Date() ? "urgente" : "atencao",
          titulo: rev < new Date() ? "Plano terapêutico com revisão vencida" : "Plano terapêutico para revisar",
          detalhe: `${nomeC} · revisão ${rev.toLocaleDateString("pt-BR")}`, href: "/plano-terapeutico", acao: "Abrir" });
      });
      setPendencias(pend);

      setUltimos(feitos.slice(0, 6).map((p: any) => {
        const d = dataDoProntuario(p);
        return { id: p.id, marca: `${d.slice(8, 10)}/${d.slice(5, 7)}`,
          titulo: (Array.isArray(p.criancas) ? p.criancas[0] : p.criancas)?.nome || "Criança", detalhe: "Prontuário registrado" };
      }));
      setRequisicoes((reqs || []).map((r: any) => ({ id: r.id, marca: STATUS_REQ[r.status]?.marca || "📦",
        titulo: r.produto, detalhe: STATUS_REQ[r.status]?.texto || r.status })));
      setReqAbertas((reqs || []).filter((r: any) => ["pendente", "em_analise", "comprado"].includes(r.status)).length);
      setAvisos((mural || []).map((a: any) => ({ id: a.id, marca: a.aniversario ? "🎂" : a.fixado ? "📌" : "📢",
        titulo: a.titulo, detalhe: new Date(a.created_at).toLocaleDateString("pt-BR") })));
      setLoading(false);
    }
    carregar();
  }, []);

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>;
  if (erro) return <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 text-center text-sm text-slate-600 shadow-sm">{erro}</div>;

  const ativos = escalaHoje.filter((i) => !i.cancelado);
  const concluidos = ativos.filter((i) => situacao(i, agoraMin).passou).length;
  const totalFaltando = prontuariosFaltando.hoje + prontuariosFaltando.antes;
  const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-6xl mx-auto space-y-3 relative">
      <Saudacao nome={nome} subtitulo={[dataExtenso, especialidade].filter(Boolean).join(" · ")} />

      <Numeros itens={[
        { label: "Atendimentos hoje", valor: ativos.length, sub: `${concluidos} concluído${concluidos === 1 ? "" : "s"} · ${ativos.length - concluidos} a seguir` },
        { label: "Prontuários a fazer", valor: totalFaltando, alerta: prontuariosFaltando.antes > 0,
          sub: totalFaltando === 0 ? "tudo registrado" : [prontuariosFaltando.antes ? `${prontuariosFaltando.antes} do dia anterior` : null,
            prontuariosFaltando.hoje ? `${prontuariosFaltando.hoje} de hoje` : null].filter(Boolean).join(" · ") },
        { label: "Crianças que atendo", valor: criancasSemana, sub: "na semana" },
        { label: "Minhas requisições", valor: reqAbertas, sub: reqAbertas === 0 ? "nenhuma em aberto" : "em aberto" },
      ]} />

      <Divisor label="Hoje" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Painel tetoCelular={false} titulo="Minha escala de hoje" sub="Com as trocas do dia já aplicadas" href="/especialista/escala" linkLabel="Minha escala →" altura="md:h-[400px]">
          <ListaEscala itens={escalaHoje} agoraMin={agoraMin} mostrarProfissional={false} hrefTodos="/especialista/escala" vazio="Você não tem atendimentos na escala de hoje." />
        </Painel>
        <Painel titulo="Precisa de você" sub="Do mais urgente ao menos urgente" altura="md:h-[400px]">
          <ListaPendencias itens={pendencias} vazio="Nenhum prontuário atrasado. ✨" />
        </Painel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Painel className="md:col-span-2" titulo="Últimos prontuários" sub="Os que você registrou nos últimos dias"
          href="/especialista/prontuarios" linkLabel="Histórico →" altura="md:h-[290px]">
          <ListaMini itens={ultimos} vazio="Nenhum prontuário registrado ainda." />
        </Painel>
        <Painel titulo="Requisições" sub="Materiais que você pediu" href="/requisicoes" linkLabel="Abrir" altura="md:h-[290px]">
          <ListaMini itens={requisicoes} vazio="Nenhum pedido de material." />
        </Painel>
        <Painel titulo="Mural" sub="Últimos avisos" href="/mural" linkLabel="Abrir" altura="md:h-[290px]">
          <ListaMini itens={avisos} vazio="Nenhum aviso no mural." />
        </Painel>
      </div>

      <Divisor label="Atalhos" />
      <Atalhos itens={[
        { href: "/especialista/relatorio", label: "Novo prontuário", icon: "📋" },
        { href: "/especialista/escala", label: "Minha escala", icon: "📅" },
        { href: "/requisicoes", label: "Pedir material", icon: "🛒" },
        { href: "/patrimonio", label: "Reportar defeito", icon: "🔧" },
      ]} />
    </div>
  );
}
