"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { hojeLocal } from "@/lib/dataUtils";

export default function ProntuarioPage() {
  const router = useRouter();
  const [criancas, setCriancas] = useState<any[]>([]);
  const [autor, setAutor] = useState<any>(null);
  const [autorAuthId, setAutorAuthId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [criancaId, setCriancaId] = useState("");
  const [data, setData] = useState(() => hojeLocal());
  const [tipoSessao, setTipoSessao] = useState("sessao");
  const [objetivoAtendimento, setObjetivoAtendimento] = useState("");
  const [avaliacao, setAvaliacao] = useState("");
  const [comportamentoInterferente, setComportamentoInterferente] = useState("");
  const [resultado, setResultado] = useState("");
  const [intervencao, setIntervencao] = useState("");
  const [avancos, setAvancos] = useState("");
  const [conclusao, setConclusao] = useState("");
  const [foto1, setFoto1] = useState<File | null>(null);
  const [foto2, setFoto2] = useState<File | null>(null);
  const [enviandoFotos, setEnviandoFotos] = useState(false);

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

    // Fotos são opcionais — sobe até 2, se a especialista anexou.
    setEnviandoFotos(true);
    const fotos: string[] = [];
    for (const foto of [foto1, foto2]) {
      if (!foto) continue;
      const ext = foto.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("prontuarios-fotos").upload(path, foto);
      if (!upErr) fotos.push(supabase.storage.from("prontuarios-fotos").getPublicUrl(path).data.publicUrl);
    }
    setEnviandoFotos(false);

    const conteudo = {
      tipo_sessao: tipoSessao,
      objetivo_atendimento: objetivoAtendimento,
      avaliacao, comportamento_interferente: comportamentoInterferente, resultado, intervencao, avancos, conclusao,
      fotos,
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
      setComportamentoInterferente("");
      setResultado(""); setIntervencao(""); setAvancos(""); setConclusao("");
      setFoto1(null); setFoto2(null);
      setTipoSessao("sessao");
      setData(hojeLocal());
    }
  }

  const campos = [
    { key: "avaliacao",   label: "Registro da Sessão", obrigatorio: true,
      dica: "Como chegou para o atendimento? Participou, foi colaborativo? Quais necessidades programadas conseguiu trabalhar?",
      valor: avaliacao, set: setAvaliacao, cor: "border-blue-300 focus:ring-blue-500", badge: "bg-blue-100 text-blue-700" },
    { key: "comportamento_interferente", label: "Comportamento Interferente", obrigatorio: false,
      dica: "Apresentou algum comportamento interferente? Qual? Em que momento, realizando qual atividade? Que manejo foi feito — o que você fez ou falou? Qual a reação do aprendiz? (deixe em branco se não houve)",
      valor: comportamentoInterferente, set: setComportamentoInterferente, cor: "border-red-300 focus:ring-red-500", badge: "bg-red-100 text-red-700" },
    { key: "intervencao", label: "Intervenção", obrigatorio: true,
      dica: "Sobre a proposta de intervenção pra sessão, o que conseguiu aplicar?",
      valor: intervencao, set: setIntervencao, cor: "border-purple-300 focus:ring-purple-500", badge: "bg-purple-100 text-purple-700" },
    { key: "avancos",     label: "Avanços", obrigatorio: true,
      dica: "O que está avançando ou melhorando?",
      valor: avancos, set: setAvancos, cor: "border-emerald-300 focus:ring-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
    { key: "conclusao",   label: "Conclusão", obrigatorio: true,
      dica: "Conclusão da sessão e próximos passos",
      valor: conclusao, set: setConclusao, cor: "border-slate-300 focus:ring-slate-500", badge: "bg-slate-100 text-slate-700" },
    { key: "resultado",   label: "Resultados", obrigatorio: true,
      dica: "O que foi identificado? Qual o desempenho observado?",
      valor: resultado, set: setResultado, cor: "border-amber-300 focus:ring-amber-500", badge: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
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
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Prontuário de Atendimento</h2>
          <p className="text-xs text-slate-400">Registro diário de sessão</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Criança + Data + Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Criança *</label>
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
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${campo.badge}`}>{campo.label}{campo.obrigatorio ? " *" : " (opcional)"}</span>
                <span className="text-xs text-slate-400">{campo.dica}</span>
              </div>
              <textarea value={campo.valor} onChange={e => campo.set(e.target.value)}
                placeholder={`${campo.label}...`} rows={3}
                className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm text-slate-700 focus:outline-none focus:ring-2 bg-white resize-none transition ${campo.cor}`}/>
            </div>
          ))}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Fotos (opcional)</span>
              <span className="text-xs text-slate-400">Até 2 fotos da criança em atividade</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="file" accept="image/*" onChange={e => setFoto1(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-semibold border border-slate-200 rounded-xl p-1.5 bg-white"/>
              <input type="file" accept="image/*" onChange={e => setFoto2(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-semibold border border-slate-200 rounded-xl p-1.5 bg-white"/>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-600 border border-blue-100 flex items-center gap-2">
            <span>📤</span>
            Este prontuário será enviado automaticamente para Supervisora e Gestão.
          </div>

          <button onClick={salvar} disabled={salvando || !camposPreenchidos}
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando ? (enviandoFotos ? "Enviando fotos..." : "Salvando...") : "Salvar e Enviar Prontuário"}
          </button>
        </div>
      </div>
    </div>
  );
}
