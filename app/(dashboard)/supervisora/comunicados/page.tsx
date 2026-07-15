"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { registrarLog } from "@/lib/auditoria";

type Aba = "dashboard" | "comunicados" | "momentos" | "evolucao" | "avisos";
type MostrarFeedbackFn = (tipo: "sucesso" | "erro", msg: string) => void;
type AbaProps = { mostrarFeedback: MostrarFeedbackFn };

type FormularioEscolar = {
  id: string; created_at: string; status: string; data: string;
  enviado_familia?: boolean; obs_supervisora?: string | null;
  hora_chegada?: string; interacao?: string[];
  autonomia_nivel?: number; idas_banheiro?: number;
  evacuou?: boolean; periodo_menstrual?: boolean;
  socializacao?: string[]; atencao?: string[];
  lanche?: string; comeu_tudo?: boolean;
  atividades_sala?: string; tarefa_casa?: string;
  materiais_pedir?: string; obs_gerais?: string;
  criancas?: { nome: string; foto_url?: string | null };
};

type SecaoItem = {
  label: string;
  valor: string | string[];
  tipo: "texto" | "tags" | "badge" | "alerta";
  cor?: string;
};

export default function SupervisoraPage() {
  const [aba, setAba] = useState<Aba>("comunicados");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [carregandoAcesso, setCarregandoAcesso] = useState(true);
  const [acessoLiberado, setAcessoLiberado] = useState(true);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setCarregandoAcesso(false); return; }
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("contata_familia")
        .eq("email", user.email)
        .maybeSingle();
      setAcessoLiberado(usuario?.contata_familia !== false);
      setCarregandoAcesso(false);
    }
    verificarAcesso();
  }, []);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  if (carregandoAcesso) {
    return <div className="text-center py-20 text-slate-400 text-sm">Carregando...</div>;
  }

  if (!acessoLiberado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          <span className="text-4xl">🔒</span>
          <h1 className="font-bold text-slate-800">Acesso restrito</h1>
          <p className="text-sm text-slate-500">Seu perfil não tem comunicação direta com as famílias. Use Materiais Adaptados ou o Chat com as especialistas.</p>
        </div>
      </div>
    );
  }

  const abas = [
    { id: "dashboard",    label: "Dashboard",          icon: "📊" },
    { id: "comunicados",  label: "Comunicados Diários", icon: "📋" },
    { id: "momentos",     label: "Momentos",            icon: "📸" },
    { id: "evolucao",     label: "Evolução",            icon: "📈" },
    { id: "avisos",       label: "Avisos",              icon: "📢" },
  ];

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Portal da Supervisora</h1>
          <p className="text-xs text-slate-400 mt-0.5">Clínica Abraço ABA</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
          Ao vivo
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id as Aba)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
              ${aba === a.id ? "bg-blue-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            <span>{a.icon}</span>
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>

      {aba === "dashboard"   && <AbaDashboard />}
      {aba === "comunicados" && <AbaComunicadosDiarios mostrarFeedback={mostrarFeedback} />}
      {aba === "momentos"    && <AbaMomentos    mostrarFeedback={mostrarFeedback} />}
      {aba === "evolucao"    && <AbaEvolucao    mostrarFeedback={mostrarFeedback} />}
      {aba === "avisos"      && <AbaAvisos      mostrarFeedback={mostrarFeedback} />}
    </div>
  );
}

// =============================================
// ABA DASHBOARD
// =============================================
function AbaDashboard() {
  const [dados, setDados] = useState({
    totalCriancas: 0,
    comunicadosPendentes: 0,
    comunicadosHoje: 0,
    enviadosHoje: 0,
    agendaHoje: [] as any[],
    ultimosComunicados: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  const hoje = new Date().toISOString().slice(0, 10);
  const hojeFormatado = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const [
        { count: totalCriancas },
        { data: formularios },
        { data: agenda },
      ] = await Promise.all([
        supabase.from("criancas").select("*", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("formularios_escolares").select("id, status, enviado_familia, data, criancas(nome)").order("created_at", { ascending: false }).limit(50),
        supabase.from("agenda").select("id, hora, servico, profissional_nome, criancas(nome)").eq("data", hoje).order("hora"),
      ]);

      const todos = formularios || [];
      const pendentes = todos.filter(f => f.status === "aguardando").length;
      const deHoje = todos.filter(f => f.data === hoje).length;
      const enviadosHoje = todos.filter(f => f.data === hoje && f.enviado_familia).length;
      const ultimos = todos.slice(0, 5);

      setDados({
        totalCriancas: totalCriancas || 0,
        comunicadosPendentes: pendentes,
        comunicadosHoje: deHoje,
        enviadosHoje,
        agendaHoje: agenda || [],
        ultimosComunicados: ultimos,
      });
      setLoading(false);
    }
    carregar();
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm">Carregando dashboard...</div>;

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest capitalize">{hojeFormatado}</p>

      {/* Cards métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-400">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Crianças</p>
          <p className="text-3xl font-black text-blue-600">{dados.totalCriancas}</p>
          <p className="text-xs text-slate-400 mt-1">ativas na clínica</p>
        </div>
        <div className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 ${dados.comunicadosPendentes > 0 ? "border-l-amber-400" : "border-l-emerald-400"}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pendentes</p>
          <p className={`text-3xl font-black ${dados.comunicadosPendentes > 0 ? "text-amber-500" : "text-emerald-500"}`}>{dados.comunicadosPendentes}</p>
          <p className="text-xs text-slate-400 mt-1">para revisar</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-purple-400">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Hoje</p>
          <p className="text-3xl font-black text-purple-600">{dados.comunicadosHoje}</p>
          <p className="text-xs text-slate-400 mt-1">comunicados recebidos</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-400">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Enviados</p>
          <p className="text-3xl font-black text-emerald-600">{dados.enviadosHoje}</p>
          <p className="text-xs text-slate-400 mt-1">para famílias hoje</p>
        </div>
      </div>

      {/* Alerta de pendentes */}
      {dados.comunicadosPendentes > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-500 text-lg">⏳</span>
          <p className="text-sm font-semibold text-amber-800">
            <span className="font-black">{dados.comunicadosPendentes}</span> comunicado{dados.comunicadosPendentes > 1 ? "s" : ""} aguardando sua revisão
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agenda de hoje */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <span>📅</span>
            <h3 className="font-semibold text-slate-700 text-sm">Agenda de Hoje</h3>
            <span className="ml-auto text-xs text-slate-400">{dados.agendaHoje.length} atendimento{dados.agendaHoje.length !== 1 ? "s" : ""}</span>
          </div>
          {dados.agendaHoje.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-1">
              <span className="text-2xl">📭</span>
              <p className="text-xs">Nenhum atendimento hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {dados.agendaHoje.slice(0, 5).map(ag => (
                <div key={ag.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-black text-blue-900 min-w-[3rem]">{ag.hora?.slice(0,5) || "--:--"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{ag.criancas?.nome || "—"}</p>
                    {ag.profissional_nome && <p className="text-[10px] text-slate-400">👤 {ag.profissional_nome}</p>}
                  </div>
                  {ag.servico && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">{ag.servico}</span>}
                </div>
              ))}
              {dados.agendaHoje.length > 5 && (
                <p className="text-xs text-center text-slate-400 py-2">+{dados.agendaHoje.length - 5} mais</p>
              )}
            </div>
          )}
        </div>

        {/* Últimos comunicados */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <span>📋</span>
            <h3 className="font-semibold text-slate-700 text-sm">Últimos Comunicados</h3>
          </div>
          {dados.ultimosComunicados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-1">
              <span className="text-2xl">📭</span>
              <p className="text-xs">Nenhum comunicado ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {dados.ultimosComunicados.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{c.criancas?.nome || "—"}</p>
                    <p className="text-[10px] text-slate-400">{new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    c.enviado_familia ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    c.status === "aguardando" ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-blue-50 text-blue-700 border-blue-100"
                  }`}>
                    {c.enviado_familia ? "✓ Enviado" : c.status === "aguardando" ? "⏳ Pendente" : "✓ Revisado"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// ABA COMUNICADOS DIÁRIOS — novo fluxo:
// supervisora revisa e envia direto para família
// =============================================
function AbaComunicadosDiarios({ mostrarFeedback }: AbaProps) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [formularios, setFormularios] = useState<FormularioEscolar[]>([]);
  const [totalPendentes, setTotalPendentes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendentes" | "enviados" | "todos">("pendentes");
  const [dataFiltro, setDataFiltro] = useState(hoje);
  const [detalhe, setDetalhe] = useState<FormularioEscolar | null>(null);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    setLoading(true);

    // Pendentes nunca são filtrados por data — um comunicado esquecido de
    // dias anteriores precisa continuar aparecendo até ser enviado.
    const { count } = await supabase
      .from("formularios_escolares")
      .select("id", { count: "exact", head: true })
      .eq("enviado_familia", false);
    setTotalPendentes(count || 0);

    let query = supabase
      .from("formularios_escolares")
      .select("*, criancas(nome, foto_url)")
      .order("created_at", { ascending: false });

    if (filtro === "pendentes") {
      query = query.eq("enviado_familia", false);
    } else {
      query = query.eq("data", dataFiltro);
      if (filtro === "enviados") query = query.eq("enviado_familia", true);
    }

    const { data, error } = await query;
    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    setFormularios(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtro, dataFiltro]);

  async function enviarParaFamilia(id: string) {
    setEnviando(true);
    const { error } = await supabase
      .from("formularios_escolares")
      .update({ status: "enviado", enviado_familia: true, obs_supervisora: obs })
      .eq("id", id);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Enviou para família",
        tabela: "formularios_escolares",
        registro_id: id,
        descricao: `Enviou comunicado de ${detalhe?.criancas?.nome || "criança"} para a família`,
      });
    }

    setEnviando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else { mostrarFeedback("sucesso", "Comunicado enviado para a família!"); setDetalhe(null); setObs(""); carregar(); }
  }

  const filtrados = formularios;

  function iniciais(nome: string) {
    return nome?.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?";
  }

  function renderDetalhe(form: FormularioEscolar) {
    const autonomiaLabel: Record<number, { label: string; cor: string }> = {
      1: { label: "Dependência Total",      cor: "bg-red-100 text-red-700 border-red-200" },
      2: { label: "Ajuda Física/Verbal",    cor: "bg-amber-100 text-amber-700 border-amber-200" },
      3: { label: "Independência Parcial",  cor: "bg-blue-100 text-blue-700 border-blue-200" },
      4: { label: "Independência Total",    cor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    };
    const autonomia = form.autonomia_nivel != null ? autonomiaLabel[form.autonomia_nivel] : undefined;

    const secoes = [
      {
        titulo: "🏁 Entrada e Interação",
        cor: "border-blue-200 bg-blue-50",
        itens: [
          form.hora_chegada && { label: "Horário de chegada", valor: form.hora_chegada, tipo: "texto" },
          form.interacao?.length && { label: "Interação inicial", valor: form.interacao, tipo: "tags" },
        ].filter(Boolean),
      },
      {
        titulo: "🛠 Autonomia e Higiene",
        cor: "border-amber-200 bg-amber-50",
        itens: [
          autonomia && { label: "Nível de independência", valor: autonomia.label, tipo: "badge", cor: autonomia.cor },
          { label: "Idas ao banheiro", valor: `${form.idas_banheiro ?? 0} vez${(form.idas_banheiro ?? 0) !== 1 ? "es" : ""}`, tipo: "texto" },
          form.evacuou !== undefined && { label: "Evacuou", valor: form.evacuou ? "Sim" : "Não", tipo: "badge", cor: form.evacuou ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200" },
          form.periodo_menstrual && { label: "Período menstrual", valor: "Sim", tipo: "badge", cor: "bg-pink-100 text-pink-700 border-pink-200" },
        ].filter(Boolean),
      },
      {
        titulo: "🏀 Recreio e Socialização",
        cor: "border-purple-200 bg-purple-50",
        itens: [
          form.socializacao?.length && { label: "Interação no recreio", valor: form.socializacao, tipo: "tags" },
          form.atencao?.length && { label: "Atenção e foco", valor: form.atencao, tipo: "tags" },
          form.lanche && { label: "Lanche", valor: form.lanche, tipo: "texto" },
          form.comeu_tudo !== undefined && { label: "Comeu tudo", valor: form.comeu_tudo ? "Sim" : "Não", tipo: "badge", cor: form.comeu_tudo ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200" },
        ].filter(Boolean),
      },
      {
        titulo: "📖 Agenda e Recados",
        cor: "border-emerald-200 bg-emerald-50",
        itens: [
          form.atividades_sala && { label: "Conteúdo de sala", valor: form.atividades_sala, tipo: "texto" },
          form.tarefa_casa && { label: "Tarefa de casa", valor: form.tarefa_casa, tipo: "texto" },
          form.materiais_pedir && { label: "⚠️ Materiais / Avisos urgentes", valor: form.materiais_pedir, tipo: "alerta" },
          form.obs_gerais && { label: "Observações gerais", valor: form.obs_gerais, tipo: "texto" },
        ].filter(Boolean),
      },
    ].filter(s => s.itens.length > 0);

    if (secoes.length === 0) return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
        <span className="text-3xl">📄</span>
        <p className="text-sm">Nenhum conteúdo registrado.</p>
      </div>
    );

    return secoes.map(secao => (
      <div key={secao.titulo} className={`rounded-xl border overflow-hidden ${secao.cor}`}>
        <div className="px-4 py-2.5 border-b border-black/5">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{secao.titulo}</p>
        </div>
        <div className="bg-white divide-y divide-slate-50">
          {(secao.itens as SecaoItem[]).map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{item.label}</p>
              {item.tipo === "tags" && (
                <div className="flex flex-wrap gap-1.5">
                  {(item.valor as string[]).map((t: string) => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">{t}</span>
                  ))}
                </div>
              )}
              {item.tipo === "badge" && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${item.cor}`}>{item.valor}</span>
              )}
              {item.tipo === "alerta" && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-700 leading-relaxed">{item.valor}</p>
                </div>
              )}
              {item.tipo === "texto" && (
                <p className="text-sm text-slate-700 leading-relaxed">{item.valor}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    ));
  }

  return (
    <div className="space-y-4">
      {totalPendentes > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-500 text-lg">⏳</span>
          <p className="text-sm font-semibold text-amber-800">
            <span className="font-black">{totalPendentes}</span> comunicado{totalPendentes > 1 ? "s" : ""} aguardando envio para a família
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
          {[
            { key: "pendentes", label: "Pendentes", icon: "⏳" },
            { key: "enviados",  label: "Enviados",  icon: "✅" },
            { key: "todos",     label: "Todos",     icon: "📋" },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filtro === f.key ? "bg-blue-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {filtro !== "pendentes" && (
          <div className="flex items-center gap-2">
            <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
            {dataFiltro !== hoje && (
              <button onClick={() => setDataFiltro(hoje)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition">
                Hoje
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">{filtro === "pendentes" ? "🎉" : "📋"}</span>
          <p className="text-sm text-slate-400 mt-2">{filtro === "pendentes" ? "Tudo enviado!" : "Nenhum encontrado."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(f => (
            <div key={f.id} onClick={() => { setDetalhe(f); setObs(""); }}
              className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition border-l-4
                ${f.enviado_familia ? "border-l-emerald-400" : "border-l-amber-400"} border-slate-200`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                    {f.criancas?.foto_url
                      ? <img src={f.criancas.foto_url} alt={f.criancas.nome} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{iniciais(f.criancas?.nome || "?")}</div>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{f.criancas?.nome}</p>
                    <p className="text-xs text-slate-400">{new Date(f.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border
                  ${f.enviado_familia ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                  {f.enviado_familia ? "✓ Enviado" : "⏳ Pendente"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="bg-blue-900 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                  {detalhe.criancas?.foto_url
                    ? <img src={detalhe.criancas.foto_url} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm">{detalhe.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{detalhe.criancas?.nome}</p>
                  <p className="text-blue-300 text-xs">{new Date(detalhe.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                </div>
              </div>
              <button onClick={() => setDetalhe(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">✕</button>
            </div>

            {/* Conteúdo */}
            <div className="overflow-y-auto flex-1 p-5 space-y-3 bg-slate-50">
              {renderDetalhe(detalhe)}

              {!detalhe.enviado_familia && (
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">✍️ Sua observação (opcional)</p>
                  </div>
                  <textarea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                    placeholder="Adicione uma observação antes de enviar para a família..."
                    className="w-full px-4 py-3 text-sm focus:outline-none resize-none"/>
                </div>
              )}

              {detalhe.obs_supervisora && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-600">Observação registrada:</p>
                  <p className="text-sm text-slate-700 mt-0.5">{detalhe.obs_supervisora}</p>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="px-5 py-4 border-t border-slate-100 bg-white">
              {!detalhe.enviado_familia ? (
                <div className="flex gap-3">
                  <button onClick={() => setDetalhe(null)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                    Fechar
                  </button>
                  <button onClick={() => enviarParaFamilia(detalhe.id)} disabled={enviando}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-50">
                    {enviando ? "Enviando..." : "📨 Enviar para Família"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-1">
                  <span className="text-emerald-600">✓</span>
                  <p className="text-sm font-semibold text-emerald-700">Já enviado para a família</p>
                </div>
              )}
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
function AbaMomentos({ mostrarFeedback }: AbaProps) {
  const [momentos, setMomentos] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [paraTodos, setParaTodos] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    const [{ data: mom }, { data: cri }] = await Promise.all([
      supabase.from("portal_momentos").select("*, criancas(nome, foto_url)").order("created_at", { ascending: false }),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    setMomentos(mom || []);
    setCriancas(cri || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  async function deletar() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("portal_momentos").delete().eq("id", deletandoId);
    setDeletandoId(null); setExcluindo(false);
    mostrarFeedback("sucesso", "Momento removido."); carregar();
  }

  async function salvar() {
    if (!paraTodos && !criancaId) { mostrarFeedback("erro", "Selecione a criança ou marque 'Todas as famílias'."); return; }
    if (!fotoFile) { mostrarFeedback("erro", "Selecione uma foto."); return; }
    setSalvando(true);
    const ext = fotoFile.name.split(".").pop();
    const path = `momentos/${paraTodos ? "todos" : criancaId}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("fotos-criancas").upload(path, fotoFile);
    if (uploadError) { mostrarFeedback("erro", "Erro no upload: " + uploadError.message); setSalvando(false); return; }
    const { data: urlData } = supabase.storage.from("fotos-criancas").getPublicUrl(path);
    const { data: novo, error } = await supabase.from("portal_momentos").insert({ crianca_id: paraTodos ? null : criancaId, descricao, imagem_url: urlData.publicUrl }).select().single();
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Publicou", tabela: "portal_momentos", registro_id: novo?.id, descricao: `Publicou momento para: ${paraTodos ? "Todas as famílias" : criancas.find(c => c.id === criancaId)?.nome}` });
    }
    setSalvando(false);
    if (error) mostrarFeedback("erro", error.message);
    else { mostrarFeedback("sucesso", "Momento publicado!"); setModalAberto(false); setCriancaId(""); setParaTodos(false); setDescricao(""); setFotoFile(null); setFotoPreview(null); carregar(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{momentos.length} momento{momentos.length !== 1 ? "s" : ""} publicado{momentos.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
          📸 Publicar momento
        </button>
      </div>
      {loading ? <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      : momentos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><span className="text-5xl">📸</span><p className="text-sm text-slate-400 mt-2">Nenhum momento publicado ainda.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {momentos.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden relative">
              <button onClick={() => setDeletandoId(m.id)}
                className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg shadow-sm transition">🗑️</button>
              <img src={m.imagem_url} alt="Momento" className="w-full h-48 object-cover"/>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  {m.crianca_id === null ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs">📢</div>
                      <p className="text-xs font-semibold text-amber-700">Todas as famílias</p>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                        {m.criancas?.foto_url ? <img src={m.criancas.foto_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{m.criancas?.nome?.charAt(0)}</div>}
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{m.criancas?.nome}</p>
                    </>
                  )}
                </div>
                {m.descricao && <p className="text-xs text-slate-500">{m.descricao}</p>}
                <p className="text-xs text-slate-300 mt-1">{new Date(m.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📸 Publicar Momento</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer">
                <input type="checkbox" checked={paraTodos} onChange={e => { setParaTodos(e.target.checked); if (e.target.checked) setCriancaId(""); }} className="w-4 h-4 accent-amber-600"/>
                <span className="text-sm font-semibold text-amber-800">📢 Publicar para todas as famílias</span>
              </label>
              {!paraTodos && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Criança *</label>
                  <select value={criancaId} onChange={e => setCriancaId(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecione...</option>
                    {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foto *</label>
                <div onClick={() => inputRef.current?.click()} className="w-full h-40 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 hover:bg-blue-50 transition">
                  {fotoPreview ? <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover"/> : <div className="text-center"><span className="text-4xl">📷</span><p className="text-xs text-slate-400 mt-2">Clique para selecionar</p></div>}
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); } }}/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição (opcional)</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Momento de recreio..." rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={salvar} disabled={salvando || (!paraTodos && !criancaId) || !fotoFile} className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">{salvando ? "Publicando..." : "Publicar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">🗑️</div>
              <div><h3 className="font-bold text-slate-800">Remover momento?</h3><p className="text-xs text-slate-400 mt-1">A foto deixa de aparecer para a(s) família(s). Esta ação não pode ser desfeita.</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} disabled={excluindo} className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">Cancelar</button>
              <button onClick={deletar} disabled={excluindo} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">{excluindo ? "Removendo..." : "Sim, remover"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA EVOLUÇÃO — supervisora revisa os relatórios enviados
// pelas especialistas e encaminha para a família
// =============================================
function parseConteudoRelatorio(raw: string): Record<string, string> {
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

function AbaEvolucao({ mostrarFeedback }: AbaProps) {
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendentes" | "enviados">("pendentes");
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [tituloFamilia, setTituloFamilia] = useState("");
  const [textoFamilia, setTextoFamilia] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prontuarios")
      .select("*, criancas(nome, foto_url)")
      .eq("tipo", "relatorio")
      .order("created_at", { ascending: false });
    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    setRelatorios(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtrados = relatorios.filter(r => filtro === "pendentes" ? !r.visivel_familia : r.visivel_familia);
  const totalPendentes = relatorios.filter(r => !r.visivel_familia).length;

  function abrirDetalhe(r: any) {
    const c = parseConteudoRelatorio(r.conteudo);
    setDetalhe(r);
    setTituloFamilia(`Evolução — ${c.periodo || new Date(r.created_at).toLocaleDateString("pt-BR")}`);
    setTextoFamilia(c.evolucao_geral || "");
  }

  async function enviarParaFamilia() {
    if (!detalhe || !tituloFamilia || !textoFamilia) { mostrarFeedback("erro", "Preencha título e texto."); return; }
    setEnviando(true);
    const { data: nova, error } = await supabase.from("portal_evolucao").insert({
      crianca_id: detalhe.crianca_id,
      titulo: tituloFamilia,
      conteudo: textoFamilia,
      autor_id: detalhe.autor_id,
    }).select().single();

    if (!error) {
      await supabase.from("prontuarios").update({ visivel_familia: true }).eq("id", detalhe.id);
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Enviou para família",
        tabela: "portal_evolucao",
        registro_id: nova?.id,
        descricao: `Enviou evolução de ${detalhe.criancas?.nome || "criança"} para a família`,
      });
    }

    setEnviando(false);
    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else { mostrarFeedback("sucesso", "Evolução enviada para a família!"); setDetalhe(null); carregar(); }
  }

  const camposRelatorio = detalhe ? parseConteudoRelatorio(detalhe.conteudo) : {};

  return (
    <div className="space-y-4">
      {totalPendentes > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-500 text-lg">⏳</span>
          <p className="text-sm font-semibold text-amber-800">
            <span className="font-black">{totalPendentes}</span> relatório{totalPendentes > 1 ? "s" : ""} de evolução aguardando envio para a família
          </p>
        </div>
      )}

      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {[
          { key: "pendentes", label: "Pendentes", icon: "⏳" },
          { key: "enviados",  label: "Enviados",  icon: "✅" },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filtro === f.key ? "bg-blue-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">{filtro === "pendentes" ? "🎉" : "📊"}</span>
          <p className="text-sm text-slate-400 mt-2">{filtro === "pendentes" ? "Nenhum relatório pendente." : "Nenhuma evolução enviada ainda."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(r => (
            <div key={r.id} onClick={() => abrirDetalhe(r)}
              className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition border-l-4
                ${r.visivel_familia ? "border-l-emerald-400" : "border-l-amber-400"} border-slate-200`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                    {r.criancas?.foto_url ? <img src={r.criancas.foto_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{r.criancas?.nome?.charAt(0)}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{r.criancas?.nome}</p>
                    <p className="text-xs text-slate-400">{r.autor_nome} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0
                  ${r.visivel_familia ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                  {r.visivel_familia ? "✓ Enviado" : "⏳ Pendente"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-white">📊 Relatório de {detalhe.criancas?.nome}</h2>
              <button onClick={() => setDetalhe(null)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4 bg-slate-50">
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">O que a especialista enviou</p>
                {camposRelatorio.evolucao_geral && (
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Evolução geral</p><p className="text-sm text-slate-700 leading-relaxed">{camposRelatorio.evolucao_geral}</p></div>
                )}
                {camposRelatorio.objetivos_alcancados && (
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Objetivos alcançados</p><p className="text-sm text-slate-700 leading-relaxed">{camposRelatorio.objetivos_alcancados}</p></div>
                )}
                {camposRelatorio.dificuldades && (
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dificuldades</p><p className="text-sm text-slate-700 leading-relaxed">{camposRelatorio.dificuldades}</p></div>
                )}
                {camposRelatorio.recomendacoes && (
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recomendações</p><p className="text-sm text-slate-700 leading-relaxed">{camposRelatorio.recomendacoes}</p></div>
                )}
              </div>

              {!detalhe.visivel_familia && (
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">✍️ O que vai para a família</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Título</label>
                      <input type="text" value={tituloFamilia} onChange={e => setTituloFamilia(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Texto</label>
                      <textarea value={textoFamilia} onChange={e => setTextoFamilia(e.target.value)} rows={5}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-white flex-shrink-0">
              {!detalhe.visivel_familia ? (
                <div className="flex gap-3">
                  <button onClick={() => setDetalhe(null)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                    Fechar
                  </button>
                  <button onClick={enviarParaFamilia} disabled={enviando}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-50">
                    {enviando ? "Enviando..." : "📨 Enviar para Família"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setDetalhe(null)}
                  className="w-full h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA AVISOS
// =============================================
const MODELOS_AVISO = [
  { icone: "🗓️", label: "Convocação para reunião",
    titulo: "Convocação para reunião",
    conteudo: "Precisamos agendar uma reunião para conversar sobre o acompanhamento de [NOME DA CRIANÇA]. Data: [DATA], horário: [HORÁRIO], local: [presencial/online]. Contamos com a presença de vocês." },
  { icone: "🔄", label: "Troca de AT (equipe)",
    titulo: "Troca de acompanhante terapêutico",
    conteudo: "Informamos que o(a) acompanhante terapêutico(a) responsável por [NOME DA CRIANÇA] muda a partir de [DATA]: quem assume é [NOME DO NOVO AT]. Pedimos à equipe envolvida que se organize para a transição." },
  { icone: "👨‍👩‍👧", label: "Troca de AT (família)",
    titulo: "Troca de acompanhante terapêutico",
    conteudo: "Informamos que, a partir de [DATA], haverá uma mudança no(a) acompanhante terapêutico(a) de [NOME DA CRIANÇA]. Sai: [NOME DE QUEM SAI]. Entra: [NOME DE QUEM ENTRA]. Qualquer dúvida, estamos à disposição." },
  { icone: "📆", label: "Reposição de atendimento",
    titulo: "Reposição de atendimento",
    conteudo: "A sessão que não pôde ser realizada foi remarcada para [DATA], às [HORÁRIO]. Contamos com a presença de [NOME DA CRIANÇA]." },
  { icone: "⏰", label: "Atraso/ausência do profissional",
    titulo: "Atraso/ausência do profissional",
    conteudo: "Informamos que o(a) profissional responsável pelo atendimento de hoje [está atrasado(a) / não poderá comparecer] devido a [MOTIVO]. [Orientação: aguardar / atendimento será remarcado]." },
  { icone: "🕒", label: "Mudança de horário fixo",
    titulo: "Mudança de horário fixo do atendimento",
    conteudo: "A partir de [DATA], o horário fixo do atendimento de [NOME DA CRIANÇA] passa a ser [NOVO HORÁRIO], [DIA DA SEMANA]." },
  { icone: "📝", label: "Avaliação/reavaliação agendada",
    titulo: "Avaliação agendada",
    conteudo: "Foi agendada uma [avaliação/reavaliação] de [NOME DA CRIANÇA] para o dia [DATA], às [HORÁRIO]. Por favor, trazer: [O QUE LEVAR]." },
  { icone: "📄", label: "Documento/cadastro pendente",
    titulo: "Documento pendente",
    conteudo: "Identificamos que está pendente o envio de [DOCUMENTO]. Pedimos que providenciem o quanto antes para regularizar o cadastro de [NOME DA CRIANÇA]." },
  { icone: "🏖️", label: "Recesso da clínica",
    titulo: "Recesso da clínica",
    conteudo: "Informamos que a clínica estará em recesso no período de [DATA INÍCIO] a [DATA FIM], sem atendimentos. Retornaremos normalmente em [DATA DE VOLTA]." },
  { icone: "🎉", label: "Evento na clínica",
    titulo: "Evento na clínica",
    conteudo: "Convidamos vocês para [NOME DO EVENTO], que acontecerá no dia [DATA], às [HORÁRIO]. A participação de [NOME DA CRIANÇA] é muito bem-vinda!" },
  { icone: "🎒", label: "Item para levar",
    titulo: "Solicitação de item",
    conteudo: "Para o próximo atendimento, pedimos que [NOME DA CRIANÇA] traga: [ITEM NECESSÁRIO]." },
  { icone: "📜", label: "Novo protocolo",
    titulo: "Novo protocolo publicado",
    conteudo: "Foi publicado um novo protocolo ([NOME DO PROTOCOLO]) na aba Protocolos. Por favor, leiam e confirmem a leitura até [DATA]." },
  { icone: "📚", label: "Material aguardando revisão",
    titulo: "Materiais aguardando revisão",
    conteudo: "Existem materiais adaptados aguardando revisão em Materiais Adaptados. Pedimos que revisem assim que possível." },
];

function AbaAvisos({ mostrarFeedback }: AbaProps) {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const [{ data: av }, { data: cri }] = await Promise.all([
      supabase.from("portal_comunicados").select("*, criancas(nome, foto_url)").order("created_at", { ascending: false }),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    setAvisos(av || []);
    setCriancas(cri || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!criancaId || !titulo) { mostrarFeedback("erro", "Selecione a criança e preencha o título."); return; }
    setSalvando(true);
    const { data: novo, error } = await supabase.from("portal_comunicados").insert({ crianca_id: criancaId, titulo, conteudo }).select().single();
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Publicou", tabela: "portal_comunicados", registro_id: novo?.id, descricao: `Publicou aviso para: ${criancas.find(c => c.id === criancaId)?.nome} — ${titulo}` });
    }
    setSalvando(false);
    if (error) mostrarFeedback("erro", error.message);
    else { mostrarFeedback("sucesso", "Aviso publicado!"); setModalAberto(false); setCriancaId(""); setTitulo(""); setConteudo(""); carregar(); }
  }

  async function deletar() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("portal_comunicados").delete().eq("id", deletandoId);
    setDeletandoId(null); setExcluindo(false);
    mostrarFeedback("sucesso", "Aviso removido."); carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{avisos.length} aviso{avisos.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">📢 Novo aviso</button>
      </div>
      {loading ? <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      : avisos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><span className="text-5xl">📢</span><p className="text-sm text-slate-400 mt-2">Nenhum aviso publicado ainda.</p></div>
      ) : (
        <div className="space-y-3">
          {avisos.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 border-l-4 border-l-amber-400 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {a.criancas?.foto_url ? <img src={a.criancas.foto_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{a.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                  <p className="text-xs text-slate-400">{a.criancas?.nome} · {new Date(a.created_at).toLocaleDateString("pt-BR")}</p>
                  {a.conteudo && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.conteudo}</p>}
                </div>
              </div>
              <button onClick={() => setDeletandoId(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">🗑️</button>
            </div>
          ))}
        </div>
      )}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">🗑️</div>
              <div><h3 className="font-bold text-slate-800">Remover aviso?</h3><p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} disabled={excluindo} className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">Cancelar</button>
              <button onClick={deletar} disabled={excluindo} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">{excluindo ? "Removendo..." : "Sim, remover"}</button>
            </div>
          </div>
        </div>
      )}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📢 Novo Aviso</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Modelo pronto (opcional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {MODELOS_AVISO.map(m => (
                    <button key={m.label} type="button"
                      onClick={() => { setTitulo(m.titulo); setConteudo(m.conteudo); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition">
                      <span>{m.icone}</span>{m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Escolher um modelo preenche título e mensagem — os trechos entre [colchetes] precisam ser substituídos antes de publicar.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Criança *</label>
                <select value={criancaId} onChange={e => setCriancaId(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título *</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Sessão extra agendada para quinta-feira" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mensagem (opcional)</label>
                <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} placeholder="Detalhes do aviso..." rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">
              <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !criancaId || !titulo} className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">{salvando ? "Publicando..." : "Publicar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
