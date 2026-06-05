"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RelatorioPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [autor, setAutor] = useState<any>(null);
  const [autorAuthId, setAutorAuthId] = useState<string | null>(null);
  const [criancaFiltro, setCriancaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  // Campos do relatório completo
  const [rCriancaId, setRCriancaId] = useState("");
  const [rDataInicio, setRDataInicio] = useState("");
  const [rDataFim, setRDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [rEvolucaoGeral, setREvolucaoGeral] = useState("");
  const [rObjetivos, setRObjetivos] = useState("");
  const [rAlcancados, setRAlcancados] = useState("");
  const [rDificuldades, setRDificuldades] = useState("");
  const [rRecomendacoes, setRRecomendacoes] = useState("");
  const [rObsPlano, setRObsPlano] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAutorAuthId(user.id);
      const { data: perfil } = await supabase
        .from("atendentes").select("id, nome, especialidade").eq("email", user.email).maybeSingle();
      if (!perfil) return;
      setAutor(perfil);
      const { data } = await supabase
        .from("prontuarios")
        .select("*, criancas(id, nome)")
        .eq("autor_id", perfil.id)
        .order("created_at", { ascending: false });
      setRegistros(data || []);
      const ids = new Set((data || []).map((p: any) => p.crianca_id));
      const { data: cs } = await supabase.from("criancas").select("id, nome").order("nome");
      setCriancas(cs || []);
      setLoading(false);
    }
    carregar();
  }, []);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 5000);
  }

  function fecharModal() {
    setModalAberto(false);
    setRCriancaId(""); setRDataInicio(""); setRDataFim(new Date().toISOString().slice(0, 10));
    setREvolucaoGeral(""); setRObjetivos(""); setRAlcancados("");
    setRDificuldades(""); setRRecomendacoes(""); setRObsPlano("");
  }

  async function salvarRelatorio() {
    if (!rCriancaId || !rEvolucaoGeral || !rObjetivos || !rAlcancados) {
      mostrarFeedback("erro", "Preencha os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    const nomeCrianca = criancas.find(c => c.id === rCriancaId)?.nome || "Paciente";
    const periodo = rDataInicio
      ? `${new Date(rDataInicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(rDataFim + "T12:00:00").toLocaleDateString("pt-BR")}`
      : new Date(rDataFim + "T12:00:00").toLocaleDateString("pt-BR");

    const conteudo = {
      periodo, evolucao_geral: rEvolucaoGeral, objetivos_trabalhados: rObjetivos,
      objetivos_alcancados: rAlcancados, dificuldades: rDificuldades,
      recomendacoes: rRecomendacoes, obs_plano: rObsPlano,
      especialidade: autor?.especialidade || "",
    };

    const { error } = await supabase.from("prontuarios").insert([{
      crianca_id: rCriancaId,
      autor_id: autorAuthId ?? autor?.id,
      autor_nome: autor?.nome || null,
      tipo: "relatorio",
      titulo: `Relatório — ${nomeCrianca} — ${periodo}`,
      conteudo: JSON.stringify(conteudo),
      visivel_familia: false,
      visivel_supervisora: true,
      visivel_gestao: true,
    }]);

    if (!error) {
      await supabase.from("notificacoes").insert([
        {
          destinatario_role: "gestao",
          titulo: `Novo relatório: ${nomeCrianca}`,
          mensagem: `${autor?.nome || "Especialista"} enviou relatório de evolução — ${periodo}`,
          tipo: "relatorio",
          link: "/gestao/relatorios",
          autor_nome: autor?.nome || null,
        },
        {
          destinatario_role: "supervisora",
          titulo: `Novo relatório: ${nomeCrianca}`,
          mensagem: `${autor?.nome || "Especialista"} enviou relatório de evolução — ${periodo}`,
          tipo: "relatorio",
          link: null,
          autor_nome: autor?.nome || null,
        },
      ]);
      mostrarFeedback("sucesso", "Relatório enviado para Supervisora e Gestão!");
      fecharModal();
      // recarrega lista
      const { data: nova } = await supabase
        .from("prontuarios").select("*, criancas(id, nome)")
        .eq("autor_id", autor.id).order("created_at", { ascending: false });
      setRegistros(nova || []);
    } else {
      mostrarFeedback("erro", "Erro ao salvar: " + error.message);
    }
    setSalvando(false);
  }

  const filtrados = useMemo(() => registros.filter(p => {
    const matchCrianca = criancaFiltro ? p.crianca_id === criancaFiltro : true;
    const matchTipo = tipoFiltro ? p.tipo === tipoFiltro : true;
    return matchCrianca && matchTipo;
  }), [registros, criancaFiltro, tipoFiltro]);

  function labelTipo(tipo: string) {
    if (tipo === "prontuario")     return "Prontuário";
    if (tipo === "relatorio")      return "Relatório";
    if (tipo === "relatorio_diario") return "Prontuário";
    if (tipo === "sessao_dtt")     return "Sessão DTT";
    return tipo;
  }

  function corTipo(tipo: string) {
    if (tipo === "relatorio")        return "bg-violet-100 text-violet-700";
    if (tipo === "prontuario" || tipo === "relatorio_diario") return "bg-blue-100 text-blue-700";
    if (tipo === "sessao_dtt")       return "bg-purple-100 text-purple-700";
    return "bg-slate-100 text-slate-600";
  }

  function parseConteudo(p: any) {
    try { return JSON.parse(p.conteudo); } catch { return null; }
  }

  const camposProntuario = [
    { key: "avaliacao",   label: "Avaliação",   badge: "bg-blue-100 text-blue-700" },
    { key: "resultado",   label: "Resultados",  badge: "bg-amber-100 text-amber-700" },
    { key: "intervencao", label: "Intervenção", badge: "bg-purple-100 text-purple-700" },
    { key: "avancos",     label: "Avanços",     badge: "bg-emerald-100 text-emerald-700" },
    { key: "conclusao",   label: "Conclusão",   badge: "bg-slate-100 text-slate-700" },
  ];

  const camposRelatorio = [
    { key: "evolucao_geral",        label: "Evolução Geral",          badge: "bg-blue-100 text-blue-700" },
    { key: "objetivos_trabalhados", label: "Objetivos Trabalhados",   badge: "bg-amber-100 text-amber-700" },
    { key: "objetivos_alcancados",  label: "Objetivos Alcançados",    badge: "bg-emerald-100 text-emerald-700" },
    { key: "dificuldades",          label: "Dificuldades",            badge: "bg-red-100 text-red-700" },
    { key: "recomendacoes",         label: "Recomendações",           badge: "bg-purple-100 text-purple-700" },
    { key: "obs_plano",             label: "Obs. para o Plano",       badge: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-blue-900">Prontuários e Relatórios</h1>
          <p className="text-xs text-slate-400">Histórico de atendimentos</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => router.push("/especialista/relatorio")}
            className="h-9 px-3 bg-blue-100 text-blue-800 text-xs font-bold rounded-xl hover:bg-blue-200 transition">
            + Prontuário
          </button>
          <button onClick={() => setModalAberto(true)}
            className="h-9 px-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition">
            + Relatório
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* Legenda */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"/>
          Prontuário — registro diário enviado após cada sessão
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block"/>
          Relatório — documento completo solicitado pela supervisora ou gestão
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={criancaFiltro} onChange={e => setCriancaFiltro(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1">
          <option value="">Todas as crianças</option>
          {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44">
          <option value="">Todos os tipos</option>
          <option value="prontuario">Prontuários</option>
          <option value="relatorio">Relatórios</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-slate-400 font-medium">Nenhum registro encontrado.</p>
          <div className="flex gap-2">
            <button onClick={() => router.push("/especialista/relatorio")}
              className="h-9 px-4 bg-blue-900 text-white text-xs font-bold rounded-xl">
              + Prontuário
            </button>
            <button onClick={() => setModalAberto(true)}
              className="h-9 px-4 bg-violet-600 text-white text-xs font-bold rounded-xl">
              + Relatório
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(p => {
            const conteudo = parseConteudo(p);
            const estaAberto = aberto === p.id;
            const isProntuario = p.tipo === "prontuario" || p.tipo === "relatorio_diario";
            const isRelatorio = p.tipo === "relatorio";
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setAberto(estaAberto ? null : p.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${corTipo(p.tipo)}`}>
                      {labelTipo(p.tipo)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.titulo}</p>
                      <p className="text-xs text-slate-400">
                        {p.criancas?.nome} · {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${estaAberto ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {estaAberto && conteudo && isProntuario && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                    {camposProntuario.map(campo => conteudo[campo.key] ? (
                      <div key={campo.key}>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label}</span>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{conteudo[campo.key]}</p>
                      </div>
                    ) : null)}
                  </div>
                )}

                {estaAberto && conteudo && isRelatorio && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                    {conteudo.periodo && (
                      <p className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg inline-block">
                        Período: {conteudo.periodo}
                      </p>
                    )}
                    {camposRelatorio.map(campo => conteudo[campo.key] ? (
                      <div key={campo.key}>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label}</span>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{conteudo[campo.key]}</p>
                      </div>
                    ) : null)}
                  </div>
                )}

                {estaAberto && conteudo && p.tipo === "sessao_dtt" && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-emerald-600">Acertos</p>
                        <p className="text-2xl font-black text-emerald-600">{conteudo.acertos}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-slate-500">Total</p>
                        <p className="text-2xl font-black text-slate-700">{conteudo.total}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-red-600">Erros</p>
                        <p className="text-2xl font-black text-red-500">{conteudo.erros}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo Relatório */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Header modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-semibold text-slate-800">Relatório de Evolução</p>
                <p className="text-xs text-slate-400">Solicitado pela supervisão/gestão</p>
              </div>
              <button onClick={fecharModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-lg leading-none">×</button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Criança */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Estudante *</label>
                <select value={rCriancaId} onChange={e => setRCriancaId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Data início</label>
                  <input type="date" value={rDataInicio} onChange={e => setRDataInicio(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Data fim</label>
                  <input type="date" value={rDataFim} onChange={e => setRDataFim(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                </div>
              </div>

              <div className="border-t border-slate-100"/>

              {/* Campos do relatório */}
              {[
                { label: "Evolução Geral *",         dica: "Descreva a evolução geral da criança no período",       val: rEvolucaoGeral,  set: setREvolucaoGeral,  badge: "bg-blue-100 text-blue-700" },
                { label: "Objetivos Trabalhados *",  dica: "Quais habilidades e objetivos foram trabalhados?",      val: rObjetivos,      set: setRObjetivos,      badge: "bg-amber-100 text-amber-700" },
                { label: "Objetivos Alcançados *",   dica: "O que a criança conseguiu atingir neste período?",      val: rAlcancados,     set: setRAlcancados,     badge: "bg-emerald-100 text-emerald-700" },
                { label: "Dificuldades",             dica: "Dificuldades encontradas durante o período",            val: rDificuldades,   set: setRDificuldades,   badge: "bg-red-100 text-red-700" },
                { label: "Recomendações",            dica: "Recomendações para continuidade do tratamento",         val: rRecomendacoes,  set: setRRecomendacoes,  badge: "bg-purple-100 text-purple-700" },
                { label: "Observações para o Plano", dica: "Informações relevantes para o plano de saúde",          val: rObsPlano,       set: setRObsPlano,       badge: "bg-slate-100 text-slate-700" },
              ].map(campo => (
                <div key={campo.label} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label}</span>
                    <span className="text-xs text-slate-400">{campo.dica}</span>
                  </div>
                  <textarea value={campo.val} onChange={e => campo.set(e.target.value)}
                    rows={3} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white resize-none"/>
                </div>
              ))}

              <div className="bg-violet-50 rounded-xl px-4 py-3 text-xs text-violet-600 border border-violet-100 flex items-center gap-2">
                <span>📤</span>
                Este relatório será enviado para Supervisora e Gestão automaticamente.
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3 flex-shrink-0">
              <button onClick={fecharModal}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvarRelatorio} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition disabled:opacity-50">
                {salvando ? "Enviando..." : "Salvar e Enviar Relatório"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
