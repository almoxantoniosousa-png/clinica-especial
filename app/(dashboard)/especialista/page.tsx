"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RelatorioPage() {
  const router = useRouter();
  const [criancas, setCriancas] = useState<any[]>([]);
  const [autor, setAutor] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  // Campos do relatório
  const [criancaId, setCriancaId] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [objetivoAtendimento, setObjetivoAtendimento] = useState("");
  const [avaliacao, setAvaliacao] = useState("");       // Como a criança chegou?
  const [resultado, setResultado] = useState("");        // O que identificou?
  const [intervencao, setIntervencao] = useState("");    // O que fez?
  const [avancos, setAvancos] = useState("");            // O que está melhorando?
  const [conclusao, setConclusao] = useState("");        // Conclusão do mês

  const criancaSelecionada = useMemo(
    () => criancas.find(c => c.id === criancaId),
    [criancas, criancaId]
  );

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from("atendentes")
          .select("id, nome, especialidade")
          .eq("email", user.email)
          .maybeSingle();
        if (perfil) setAutor(perfil);
      }
      const { data } = await supabase
        .from("criancas")
        .select("id, nome, idade, serie, ano")
        .order("nome");
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
      mostrarFeedback("erro", "Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);

    const conteudo = {
      objetivo_atendimento: objetivoAtendimento,
      avaliacao,
      resultado,
      intervencao,
      avancos,
      conclusao,
      data_sessao: data,
      especialidade: autor?.especialidade || "",
    };

    const { error } = await supabase.from("prontuarios").insert([{
      crianca_id: criancaId,
      autor_id: autor?.id,
      tipo: "relatorio_diario",
      titulo: `Relatório de Avaliação — ${new Date(data + "T12:00:00").toLocaleDateString("pt-BR")}`,
      conteudo: JSON.stringify(conteudo),
      visivel_familia: false,
      visivel_supervisora: true,
      visivel_gestao: true,
    }]);

    setSalvando(false);

    if (error) {
      mostrarFeedback("erro", "Erro ao salvar: " + error.message);
    } else {
      mostrarFeedback("sucesso", "Relatório salvo e enviado para Supervisora e Gestão!");
      // Limpa formulário
      setCriancaId("");
      setObjetivoAtendimento("");
      setAvaliacao("");
      setResultado("");
      setIntervencao("");
      setAvancos("");
      setConclusao("");
      setData(new Date().toISOString().slice(0, 10));
    }
  }

  const campos = [
    {
      key: "avaliacao",
      label: "Avaliação",
      dica: "Como a criança chegou?",
      valor: avaliacao,
      set: setAvaliacao,
      cor: "border-blue-300 focus:ring-blue-500",
      badge: "bg-blue-100 text-blue-700",
    },
    {
      key: "resultado",
      label: "Resultados",
      dica: "O que identificou na avaliação? Qual o problema identificado?",
      valor: resultado,
      set: setResultado,
      cor: "border-amber-300 focus:ring-amber-500",
      badge: "bg-amber-100 text-amber-700",
    },
    {
      key: "intervencao",
      label: "Intervenção",
      dica: "O que você fez dentro do seu trabalho para a criança adquirir a habilidade que apresentava dificuldade?",
      valor: intervencao,
      set: setIntervencao,
      cor: "border-purple-300 focus:ring-purple-500",
      badge: "bg-purple-100 text-purple-700",
    },
    {
      key: "avancos",
      label: "Avanços",
      dica: "Durante sua intervenção o que está avançando / melhorando?",
      valor: avancos,
      set: setAvancos,
      cor: "border-emerald-300 focus:ring-emerald-500",
      badge: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "conclusao",
      label: "Conclusão",
      dica: "Conclusão do mês",
      valor: conclusao,
      set: setConclusao,
      cor: "border-slate-300 focus:ring-slate-500",
      badge: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-blue-900">Relatório de Avaliação</h1>
          <p className="text-xs text-slate-400">Desempenho e evoluções — {autor?.nome || "Especialista"}</p>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}
        >
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* CARD PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Topo do formulário — igual ao papel */}
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Relatório de Avaliação</h2>
          <p className="text-xs text-slate-400">Desempenho e evoluções do atendimento</p>
        </div>

        <div className="p-5 space-y-5">

          {/* Dados da criança + data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Estudante <span className="text-red-500">*</span>
              </label>
              <select
                value={criancaId}
                onChange={e => setCriancaId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione a criança...</option>
                {criancas.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Dados da criança selecionada */}
          {criancaSelecionada && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-sm">
              <span className="text-blue-800 font-semibold">{criancaSelecionada.nome}</span>
              {criancaSelecionada.idade && (
                <span className="text-blue-600">Idade: <strong>{criancaSelecionada.idade}</strong></span>
              )}
              {criancaSelecionada.serie && (
                <span className="text-blue-600">Série: <strong>{criancaSelecionada.serie}</strong></span>
              )}
              {criancaSelecionada.ano && (
                <span className="text-blue-600">Ano: <strong>{criancaSelecionada.ano}</strong></span>
              )}
            </div>
          )}

          {/* Objetivo do atendimento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Qual o objetivo do atendimento?
            </label>
            <textarea
              value={objetivoAtendimento}
              onChange={e => setObjetivoAtendimento(e.target.value)}
              placeholder="Descreva o objetivo do atendimento desta criança..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
            />
          </div>

          {/* Divisor */}
          <div className="border-t border-slate-100"/>

          {/* Campos principais — 5 colunas do formulário físico */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registro da Sessão</p>
            {campos.map(campo => (
              <div key={campo.key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>
                    {campo.label}
                  </span>
                  <span className="text-xs text-slate-400">{campo.dica}</span>
                </div>
                <textarea
                  value={campo.valor}
                  onChange={e => campo.set(e.target.value)}
                  placeholder={`${campo.label}...`}
                  rows={3}
                  className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm text-slate-700
                    focus:outline-none focus:ring-2 bg-white resize-none transition ${campo.cor}`}
                />
              </div>
            ))}
          </div>

          {/* Rodapé info */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-400 space-y-0.5 border border-slate-100">
            <p>📋 Este relatório será enviado automaticamente para <strong className="text-slate-600">Supervisora</strong> e <strong className="text-slate-600">Gestão</strong>.</p>
            <p>📊 A cada 6 meses, a Direção consolidará os relatórios para o plano de saúde.</p>
          </div>

          {/* Botão salvar */}
          <button
            onClick={salvar}
            disabled={salvando || !camposPreenchidos}
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm
              rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Salvando...
              </>
            ) : (
              <>📤 Salvar e Enviar Relatório</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}