"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { registrarLog } from "@/lib/auditoria";

type Aba = "dashboard" | "comunicados" | "momentos" | "evolucao" | "avisos";
type MostrarFeedbackFn = (tipo: "sucesso" | "erro", msg: string) => void;
type AbaProps = { mostrarFeedback: MostrarFeedbackFn };

type FormularioEscolar = {
  id: string; created_at: string; status: string;
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

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
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
          <p className="text-xs text-slate-400 mt-1">em atendimento</p>
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
  const [formularios, setFormularios] = useState<FormularioEscolar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendentes" | "enviados" | "todos">("pendentes");
  const [detalhe, setDetalhe] = useState<FormularioEscolar | null>(null);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("formularios_escolares")
      .select("*, criancas(nome, foto_url)")
      .order("created_at", { ascending: false });
    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    setFormularios(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

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

  const filtrados = formularios.filter(f => {
    if (filtro === "pendentes") return !f.enviado_familia;
    if (filtro === "enviados")  return f.enviado_familia;
    return true;
  });

  const totalPendentes = formularios.filter(f => !f.enviado_familia).length;

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
    const autonomia = autonomiaLabel[form.autonomia_nivel];

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
                      : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{iniciais(f.criancas?.nome)}</div>}
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
  const [descricao, setDescricao] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
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

  async function salvar() {
    if (!criancaId || !fotoFile) { mostrarFeedback("erro", "Selecione a criança e uma foto."); return; }
    setSalvando(true);
    const ext = fotoFile.name.split(".").pop();
    const path = `momentos/${criancaId}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("fotos-criancas").upload(path, fotoFile);
    if (uploadError) { mostrarFeedback("erro", "Erro no upload: " + uploadError.message); setSalvando(false); return; }
    const { data: urlData } = supabase.storage.from("fotos-criancas").getPublicUrl(path);
    const { data: novo, error } = await supabase.from("portal_momentos").insert({ crianca_id: criancaId, descricao, imagem_url: urlData.publicUrl }).select().single();
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Publicou", tabela: "portal_momentos", registro_id: novo?.id, descricao: `Publicou momento para: ${criancas.find(c => c.id === criancaId)?.nome}` });
    }
    setSalvando(false);
    if (error) mostrarFeedback("erro", error.message);
    else { mostrarFeedback("sucesso", "Momento publicado!"); setModalAberto(false); setCriancaId(""); setDescricao(""); setFotoFile(null); setFotoPreview(null); carregar(); }
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
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <img src={m.imagem_url} alt="Momento" className="w-full h-48 object-cover"/>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                    {m.criancas?.foto_url ? <img src={m.criancas.foto_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{m.criancas?.nome?.charAt(0)}</div>}
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{m.criancas?.nome}</p>
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
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Criança *</label>
                <select value={criancaId} onChange={e => setCriancaId(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
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
                <button onClick={salvar} disabled={salvando || !criancaId || !fotoFile} className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">{salvando ? "Publicando..." : "Publicar"}</button>
              </div>
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
function AbaEvolucao({ mostrarFeedback }: AbaProps) {
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
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
    const [{ data: evol }, { data: cri }] = await Promise.all([
      supabase.from("portal_evolucao").select("*, criancas(nome, foto_url)").order("created_at", { ascending: false }),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    setEvolucoes(evol || []);
    setCriancas(cri || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!criancaId || !titulo || !conteudo) { mostrarFeedback("erro", "Preencha todos os campos."); return; }
    setSalvando(true);
    const { data: nova, error } = await supabase.from("portal_evolucao").insert({ crianca_id: criancaId, titulo, conteudo }).select().single();
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Publicou", tabela: "portal_evolucao", registro_id: nova?.id, descricao: `Publicou evolução para: ${criancas.find(c => c.id === criancaId)?.nome} — ${titulo}` });
    }
    setSalvando(false);
    if (error) mostrarFeedback("erro", error.message);
    else { mostrarFeedback("sucesso", "Evolução publicada!"); setModalAberto(false); setCriancaId(""); setTitulo(""); setConteudo(""); carregar(); }
  }

  async function deletar() {
    if (!deletandoId) return;
    setExcluindo(true);
    await supabase.from("portal_evolucao").delete().eq("id", deletandoId);
    setDeletandoId(null); setExcluindo(false);
    mostrarFeedback("sucesso", "Registro removido."); carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{evolucoes.length} registro{evolucoes.length !== 1 ? "s" : ""} de evolução</p>
        <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">📊 Novo registro</button>
      </div>
      {loading ? <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      : evolucoes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><span className="text-5xl">📊</span><p className="text-sm text-slate-400 mt-2">Nenhum registro ainda.</p></div>
      ) : (
        <div className="space-y-3">
          {evolucoes.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 border-l-4 border-l-blue-400 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {e.criancas?.foto_url ? <img src={e.criancas.foto_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{e.criancas?.nome?.charAt(0)}</div>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{e.titulo}</p>
                  <p className="text-xs text-slate-400">{e.criancas?.nome} · {new Date(e.created_at).toLocaleDateString("pt-BR")}</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1 line-clamp-2">{e.conteudo}</p>
                </div>
              </div>
              <button onClick={() => setDeletandoId(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">🗑️</button>
            </div>
          ))}
        </div>
      )}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">🗑️</div>
              <div><h3 className="font-bold text-slate-800">Remover registro?</h3><p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p></div>
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📊 Registrar Evolução</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Criança *</label>
                <select value={criancaId} onChange={e => setCriancaId(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título *</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Evolução na comunicação — Maio 2026" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Conteúdo *</label>
                <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} placeholder="Descreva a evolução observada no período..." rows={5} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={salvar} disabled={salvando || !criancaId || !titulo || !conteudo} className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">{salvando ? "Publicando..." : "Publicar"}</button>
              </div>
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">📢 Novo Aviso</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
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
              <div className="flex gap-3">
                <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={salvar} disabled={salvando || !criancaId || !titulo} className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">{salvando ? "Publicando..." : "Publicar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
