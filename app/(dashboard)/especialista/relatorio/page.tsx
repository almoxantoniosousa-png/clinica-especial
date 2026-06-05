"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ProntuarioPage() {
  const router = useRouter();
  const [criancas, setCriancas] = useState<any[]>([]);
  const [autor, setAutor] = useState<any>(null);
  const [autorAuthId, setAutorAuthId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [criancaId, setCriancaId] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoSessao, setTipoSessao] = useState("sessao");
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
      mostrarFeedback("erro", "Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    const conteudo = {
      tipo_sessao: tipoSessao,
      objetivo_atendimento: objetivoAtendimento,
      avaliacao, resultado, intervencao, avancos, conclusao,
      data_sessao: data,
      especialidade: autor?.especialidade || "",
    };
    const nomeCrianca = criancaSelecionada?.nome || "Paciente";
    const { error } = await supabase.from("prontuarios").insert([{
      crianca_id: criancaId,
      autor_id: autorAuthId ?? autor?.id,
      autor_nome: autor?.nome || null,
      tipo: "prontuario",
      titulo: `Prontuário — ${nomeCrianca} — ${new Date(data + "T12:00:00").toLocaleDateString("pt-BR")}`,
      conteudo: JSON.stringify(conteudo),
      visivel_familia: false,
      visivel_supervisora: true,
      visivel_gestao: true,
    }]);
    setSalvando(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao salvar: " + error.message);
    } else {
      await supabase.from("notificacoes").insert([
        {
          destinatario_role: "gestao",
          titulo: `Novo prontuário: ${nomeCrianca}`,
          mensagem: `${autor?.nome || "Especialista"} registrou prontuário de atendimento`,
          tipo: "prontuario",
          link: "/gestao/relatorios",
          autor_nome: autor?.nome || null,
        },
        {
          destinatario_role: "supervisora",
          titulo: `Novo prontuário: ${nomeCrianca}`,
          mensagem: `${autor?.nome || "Especialista"} registrou prontuário de atendimento`,
          tipo: "prontuario",
          link: null,
          autor_nome: autor?.nome || null,
        },
      ]);
      mostrarFeedback("sucesso", "Prontuário salvo e enviado para Supervisora e Gestão!");
      setCriancaId(""); setObjetivoAtendimento(""); setAvaliacao("");
      setResultado(""); setIntervencao(""); setAvancos(""); setConclusao("");
      setTipoSessao("sessao");
      setData(new Date().toISOString().slice(0, 10));
    }
  }

  const campos = [
    { key: "avaliacao",   label: "Avaliação",   dica: "Como a criança chegou? Estado inicial da sessão",        valor: avaliacao,   set: setAvaliacao,   cor: "border-blue-300 focus:ring-blue-500",     badge: "bg-blue-100 text-blue-700" },
    { key: "resultado",   label: "Resultados",  dica: "O que foi identificado? Qual o desempenho observado?",   valor: resultado,   set: setResultado,   cor: "border-amber-300 focus:ring-amber-500",   badge: "bg-amber-100 text-amber-700" },
    { key: "intervencao", label: "Intervenção", dica: "O que foi feito para a criança adquirir a habilidade?",  valor: intervencao, set: setIntervencao, cor: "border-purple-300 focus:ring-purple-500",  badge: "bg-purple-100 text-purple-700" },
    { key: "avancos",     label: "Avanços",     dica: "O que está avançando ou melhorando?",                   valor: avancos,     set: setAvancos,     cor: "border-emerald-300 focus:ring-emerald-500",badge: "bg-emerald-100 text-emerald-700" },
    { key: "conclusao",   label: "Conclusão",   dica: "Conclusão da sessão e próximos passos",                  valor: conclusao,   set: setConclusao,   cor: "border-slate-300 focus:ring-slate-500",   badge: "bg-slate-100 text-slate-700" },
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
          <h1 className="text-xl font-bold text-blue-900">Prontuário de Atendimento</h1>
          <p className="text-xs text-slate-400">{autor?.nome || "Especialista"} — Registro diário de sessão</p>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-blue-900 px-6 py-4 flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-full bg-white p-0.5"/>
          <div>
            <p className="text-white font-bold text-sm">Clínica Abraço ABA</p>
            <p className="text-blue-300 text-xs">Prontuário de Atendimento — Registro Diário</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Criança + Data + Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estudante *</label>
              <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Selecione...</option>
                {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de sessão</label>
              <select value={tipoSessao} onChange={e => setTipoSessao(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="sessao">Sessão</option>
                <option value="avaliacao">Avaliação</option>
                <option value="reuniao">Reunião</option>
              </select>
            </div>
          </div>

          {criancaSelecionada && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-blue-800">
              {criancaSelecionada.nome}
              {autor?.especialidade && <span className="ml-2 text-blue-400 font-normal">— {autor.especialidade}</span>}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objetivo do atendimento</label>
            <textarea value={objetivoAtendimento} onChange={e => setObjetivoAtendimento(e.target.value)}
              placeholder="Descreva o objetivo da sessão..." rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"/>
          </div>

          <div className="border-t border-slate-100"/>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registro da Sessão</p>
          {campos.map(campo => (
            <div key={campo.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label} *</span>
                <span className="text-xs text-slate-400">{campo.dica}</span>
              </div>
              <textarea value={campo.valor} onChange={e => campo.set(e.target.value)}
                placeholder={`${campo.label}...`} rows={3}
                className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm text-slate-700 focus:outline-none focus:ring-2 bg-white resize-none transition ${campo.cor}`}/>
            </div>
          ))}

          <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-600 border border-blue-100 flex items-center gap-2">
            <span>📤</span>
            Este prontuário será enviado automaticamente para Supervisora e Gestão.
          </div>

          <button onClick={salvar} disabled={salvando || !camposPreenchidos}
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando ? "Salvando..." : "Salvar e Enviar Prontuário"}
          </button>
        </div>
      </div>
    </div>
  );
}
