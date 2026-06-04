"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RelatorioPage() {
  const router = useRouter();
  const [criancas, setCriancas] = useState<any[]>([]);
  const [autor, setAutor] = useState<any>(null);
  const [autorAuthId, setAutorAuthId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [criancaId, setCriancaId] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [objetivoAtendimento, setObjetivoAtendimento] = useState("");
  const [avaliacao, setAvaliacao] = useState("");
  const [resultado, setResultado] = useState("");
  const [intervencao, setIntervencao] = useState("");
  const [avancos, setAvancos] = useState("");
  const [conclusao, setConclusao] = useState("");

  const criancaSelecionada = useMemo(
    () => criancas.find(c => c.id === criancaId),
    [criancas, criancaId]
  );

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAutorAuthId(user.id);
        const { data: porId } = await supabase
          .from("atendentes").select("id, nome, especialidade")
          .eq("id", user.id).maybeSingle();
        if (porId) {
          setAutor(porId);
        } else {
          const { data: porEmail } = await supabase
            .from("atendentes").select("id, nome, especialidade")
            .eq("email", user.email).maybeSingle();
          if (porEmail) setAutor(porEmail);
        }
      }
      const { data } = await supabase.from("criancas").select("id, nome").order("nome");
      setCriancas(data || []);
    }
    carregar();
  }, []);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 5000);
  }

  const camposPreenchidos = criancaId && avaliacao && resultado && intervencao && avancos && conclusao;

  async function salvar() {
    if (!camposPreenchidos) {
      mostrarFeedback("erro", "Preencha todos os campos obrigatorios.");
      return;
    }
    setSalvando(true);
    const conteudo = {
      objetivo_atendimento: objetivoAtendimento,
      avaliacao, resultado, intervencao, avancos, conclusao,
      data_sessao: data,
      especialidade: autor?.especialidade || "",
    };
    const { error } = await supabase.from("prontuarios").insert([{
      crianca_id: criancaId,
      autor_id: autorAuthId ?? autor?.id,
      autor_nome: autor?.nome || null,
      tipo: "relatorio_diario",
      titulo: `Relatorio de Avaliacao -- ${new Date(data + "T12:00:00").toLocaleDateString("pt-BR")}`,
      conteudo: JSON.stringify(conteudo),
      visivel_familia: false,
      visivel_supervisora: true,
      visivel_gestao: true,
    }]);
    setSalvando(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao salvar: " + error.message);
    } else {
      const nomeCrianca = criancaSelecionada?.nome || "Paciente";
      await supabase.from("notificacoes").insert([
        {
          destinatario_role: "gestao",
          titulo: `Novo relatório: ${nomeCrianca}`,
          mensagem: `${autor?.nome || "Especialista"} enviou relatório de avaliação`,
          tipo: "relatorio",
          link: "/gestao/relatorios",
          autor_nome: autor?.nome || null,
        },
        {
          destinatario_role: "supervisora",
          titulo: `Novo relatório: ${nomeCrianca}`,
          mensagem: `${autor?.nome || "Especialista"} enviou relatório de avaliação`,
          tipo: "relatorio",
          link: null,
          autor_nome: autor?.nome || null,
        },
      ]);
      mostrarFeedback("sucesso", "Relatorio salvo e enviado para Supervisora e Gestao!");
      setCriancaId(""); setObjetivoAtendimento(""); setAvaliacao("");
      setResultado(""); setIntervencao(""); setAvancos(""); setConclusao("");
      setData(new Date().toISOString().slice(0, 10));
    }
  }

  const campos = [
    { key: "avaliacao",   label: "Avaliacao",   dica: "Como a crianca chegou?", valor: avaliacao, set: setAvaliacao, cor: "border-blue-300 focus:ring-blue-500", badge: "bg-blue-100 text-blue-700" },
    { key: "resultado",   label: "Resultados",  dica: "O que identificou? Qual o problema identificado?", valor: resultado, set: setResultado, cor: "border-amber-300 focus:ring-amber-500", badge: "bg-amber-100 text-amber-700" },
    { key: "intervencao", label: "Intervencao", dica: "O que voce fez para a crianca adquirir a habilidade?", valor: intervencao, set: setIntervencao, cor: "border-purple-300 focus:ring-purple-500", badge: "bg-purple-100 text-purple-700" },
    { key: "avancos",     label: "Avancos",     dica: "O que esta avancando / melhorando?", valor: avancos, set: setAvancos, cor: "border-emerald-300 focus:ring-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
    { key: "conclusao",   label: "Conclusao",   dica: "Conclusao do mes", valor: conclusao, set: setConclusao, cor: "border-slate-300 focus:ring-slate-500", badge: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-blue-900">Relatorio de Avaliacao</h1>
          <p className="text-xs text-slate-400">{autor?.nome || "Especialista"}</p>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "V" : "X"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-6 py-4 flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-full bg-white p-0.5"/>
          <div>
            <p className="text-white font-bold text-sm">Clinica Abraco ABA</p>
            <p className="text-blue-300 text-xs">Relatorio de Avaliacao de Desempenho e Evolucoes</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estudante *</label>
              <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Selecione a crianca...</option>
                {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
            </div>
          </div>

          {criancaSelecionada && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-sm">
              <span className="text-blue-800 font-semibold">{criancaSelecionada.nome}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objetivo do atendimento</label>
            <textarea value={objetivoAtendimento} onChange={e => setObjetivoAtendimento(e.target.value)}
              placeholder="Descreva o objetivo do atendimento..." rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"/>
          </div>

          <div className="border-t border-slate-100"/>

          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registro da Sessao</p>
            {campos.map(campo => (
              <div key={campo.key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label}</span>
                  <span className="text-xs text-slate-400">{campo.dica}</span>
                </div>
                <textarea value={campo.valor} onChange={e => campo.set(e.target.value)}
                  placeholder={`${campo.label}...`} rows={3}
                  className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm text-slate-700 focus:outline-none focus:ring-2 bg-white resize-none transition ${campo.cor}`}/>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-400 border border-slate-100">
            <p>Este relatorio sera enviado para Supervisora e Gestao automaticamente.</p>
          </div>

          <button onClick={salvar} disabled={salvando || !camposPreenchidos}
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando ? "Salvando..." : "Salvar e Enviar Relatorio"}
          </button>
        </div>
      </div>
    </div>
  );
}