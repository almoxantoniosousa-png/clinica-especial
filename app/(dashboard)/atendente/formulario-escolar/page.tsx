"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const ETAPAS = [
  { num: 1, titulo: "Entrada e Interação", icon: "🏁" },
  { num: 2, titulo: "Autonomia e Higiene", icon: "🛠" },
  { num: 3, titulo: "Recreio e Socialização", icon: "🏀" },
  { num: 4, titulo: "Agenda e Recados", icon: "📖" },
];

export default function FormularioEscolarPage() {

  const router = useRouter();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [criancaId, setCriancaId] = useState("");
  const [atId, setAtId] = useState("");
  const [atNome, setAtNome] = useState("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [verificandoPendencia, setVerificandoPendencia] = useState(true);
  const [correcaoPendente, setCorrecaoPendente] = useState<any | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [horaChegada, setHoraChegada] = useState("");
  const [interacao, setInteracao] = useState<string[]>([]);
  const [autonomiaNivel, setAutonomiaNivel] = useState(0);
  const [periodoMenstrual, setPeriodoMenstrual] = useState(false);
  const [idasBanheiro, setIdasBanheiro] = useState(0);
  const [evacuou, setEvacuou] = useState(false);
  const [aguaIngestao, setAguaIngestao] = useState("");
  const [socializacao, setSocializacao] = useState<string[]>([]);
  const [atencao, setAtencao] = useState<string[]>([]);
  const [lanche, setLanche] = useState("");
  const [comeuTudo, setComeuTudo] = useState(false);
  const [atividadesSala, setAtividadesSala] = useState("");
  const [tarefaCasa, setTarefaCasa] = useState("");
  const [materiaisPedir, setMateriaisPedir] = useState("");
  const [obsGerais, setObsGerais] = useState("");
  const [eventosEscolares, setEventosEscolares] = useState("");

  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAtId(user.id);
        const { data: perfil } = await supabase
          .from("atendentes").select("nome").eq("email", user.email).maybeSingle();
        if (perfil?.nome) setAtNome(perfil.nome);

        const { data: pendencia } = await supabase
          .from("formularios_escolares")
          .select("*")
          .eq("at_id", user.id)
          .eq("correcao_solicitada", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (pendencia) setCorrecaoPendente(pendencia);
      }
      const { data } = await supabase.from("criancas").select("id, nome, foto_url").order("nome");
      setCriancas(data || []);
      setVerificandoPendencia(false);
    }
    inicializar();
  }, []);

  function corrigirAgora() {
    if (!correcaoPendente) return;
    const p = correcaoPendente;
    setEditandoId(p.id);
    setCriancaId(p.crianca_id);
    setHoraChegada(p.hora_chegada || "");
    setInteracao(p.interacao || []);
    setAutonomiaNivel(p.autonomia_nivel || 0);
    setPeriodoMenstrual(p.periodo_menstrual || false);
    setIdasBanheiro(p.idas_banheiro || 0);
    setEvacuou(p.evacuou || false);
    setAguaIngestao(p.agua_ingestao || "");
    setSocializacao(p.socializacao || []);
    setAtencao(p.atencao || []);
    setLanche(p.lanche || "");
    setComeuTudo(p.comeu_tudo || false);
    setAtividadesSala(p.atividades_sala || "");
    setTarefaCasa(p.tarefa_casa || "");
    setMateriaisPedir(p.materiais_pedir || "");
    setObsGerais(p.obs_gerais || "");
    setEventosEscolares(p.eventos_escolares || "");
    setEtapa(1);
  }

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  function toggleOpcao(lista: string[], setLista: (v: string[]) => void, valor: string) {
    if (lista.includes(valor)) setLista(lista.filter(i => i !== valor));
    else setLista([...lista, valor]);
  }

  function avancar() {
    if (etapa === 1 && !criancaId) {
      mostrarFeedback("erro", "Selecione a criança antes de continuar.");
      return;
    }
    if (etapa === 1 && !horaChegada) {
      mostrarFeedback("erro", "Informe o horário de chegada antes de continuar.");
      return;
    }
    if (etapa < 4) setEtapa(etapa + 1);
  }

  async function enviarFormulario() {
    if (!criancaId) { mostrarFeedback("erro", "Selecione a criança."); return; }
    setSalvando(true);

    const campos = {
      crianca_id: criancaId,
      hora_chegada: horaChegada, interacao,
      autonomia_nivel: autonomiaNivel, periodo_menstrual: periodoMenstrual,
      idas_banheiro: idasBanheiro, evacuou, agua_ingestao: aguaIngestao, socializacao, atencao,
      lanche, comeu_tudo: comeuTudo, atividades_sala: atividadesSala,
      tarefa_casa: tarefaCasa, materiais_pedir: materiaisPedir,
      obs_gerais: obsGerais, eventos_escolares: eventosEscolares,
    };

    const { error } = editandoId
      ? await supabase.from("formularios_escolares").update({ ...campos, correcao_solicitada: false }).eq("id", editandoId)
      : await supabase.from("formularios_escolares").insert([{
          ...campos, at_id: atId, data: hoje,
          enviado_supervisora: true, enviado_familia: false, status: 'aguardando',
        }]);

    setSalvando(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao enviar: " + error.message);
    } else {
      mostrarFeedback("sucesso", editandoId ? "Comunicado corrigido e reenviado à supervisora!" : "Comunicado enviado! Aguardando aprovação da supervisora.");
      setTimeout(() => router.push("/atendente/meus-atendimentos"), 2000);
    }
  }

  const criancaSelecionada = criancas.find(c => c.id === criancaId);
  const progresso = (etapa / 4) * 100;

  const Toggle = ({ value, onChange, label, icon }: any) => (
    <div onClick={() => onChange(!value)}
      className={"flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition " +
        (value ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300")}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <p className="font-semibold text-slate-800 text-sm">{label}</p>
      </div>
      <div className={"w-12 h-6 rounded-full transition-all relative " + (value ? "bg-emerald-500" : "bg-slate-200")}>
        <div className={"w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all " + (value ? "left-6" : "left-0.5")}/>
      </div>
    </div>
  );

  if (verificandoPendencia) {
    return <div className="text-center py-20 text-slate-400 text-sm">Carregando...</div>;
  }

  if (correcaoPendente && !editandoId) {
    return (
      <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10">
        <div className="max-w-lg mx-auto bg-white border border-orange-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-orange-50 px-5 py-4 border-b border-orange-100 flex items-center gap-2">
            <span className="text-xl">🔁</span>
            <p className="font-bold text-orange-700 text-sm">Correção pendente</p>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-slate-600">
              A supervisora pediu para refazer o comunicado de{" "}
              <span className="font-semibold text-slate-800">
                {criancas.find(c => c.id === correcaoPendente.crianca_id)?.nome || "criança"}
              </span>{" "}
              do dia {new Date(correcaoPendente.data + "T12:00:00").toLocaleDateString("pt-BR")}:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-sm text-slate-700">{correcaoPendente.correcao_texto}</p>
            </div>
            <p className="text-xs text-slate-400">
              Você precisa corrigir esse comunicado antes de conseguir criar um novo.
            </p>
            <button onClick={corrigirAgora}
              className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition active:scale-95">
              Corrigir agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-5">

      <div>
        <h1 className="text-xl font-bold text-slate-900">{editandoId ? "Corrigindo Comunicado" : "Comunicado Diário"}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {atNome || "Atendente"} · {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        {editandoId && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Correção pedida pela supervisora</p>
            <p className="text-sm text-orange-800">{correcaoPendente?.correcao_texto}</p>
          </div>
        )}
      </div>

      {feedback && (
        <div className={"flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border " +
          (feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* PROGRESSO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{ETAPAS[etapa - 1].icon}</span>
            <span className="font-semibold text-slate-800 text-sm">{ETAPAS[etapa - 1].titulo}</span>
          </div>
          <span className="text-xs font-bold text-slate-400">Passo {etapa} de 4</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }}/>
        </div>
        <div className="flex items-center justify-between px-1">
          {ETAPAS.map(e => (
            <button key={e.num} onClick={() => e.num < etapa && setEtapa(e.num)}
              className={e.num < etapa ? "cursor-pointer flex flex-col items-center gap-1" : "cursor-default flex flex-col items-center gap-1"}>
              <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition " +
                (e.num === etapa ? "bg-blue-600 text-white" : e.num < etapa ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                {e.num < etapa ? "✓" : e.num}
              </div>
              <span className={"text-xs hidden sm:block " + (e.num === etapa ? "text-blue-600 font-semibold" : "text-slate-400")}>
                {e.titulo.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">

        {etapa === 1 && (
          <div className="space-y-5">
            <h2 className="font-bold text-blue-900 text-lg">🏁 Entrada e Interação</h2>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Criança *</label>
              <select value={criancaId} onChange={e => setCriancaId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="">Selecione a criança...</option>
                {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {criancaSelecionada && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-blue-200 flex-shrink-0">
                    {criancaSelecionada.foto_url
                      ? <img src={criancaSelecionada.foto_url} alt={criancaSelecionada.nome} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">{criancaSelecionada.nome.charAt(0)}</div>}
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">{criancaSelecionada.nome}</p>
                    <p className="text-xs text-blue-500">Selecionada para o comunicado</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horário de Chegada</label>
              <input type="time" value={horaChegada} onChange={e => setHoraChegada(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Interação Inicial</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["Cumprimenta Pares", "Cumprimenta Adultos", "Interage na Sala", "Abraça/Contato Físico"].map(op => (
                  <button key={op} type="button" onClick={() => toggleOpcao(interacao, setInteracao, op)}
                    className={"px-4 py-3 rounded-xl text-sm font-medium border-2 transition text-left " +
                      (interacao.includes(op) ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    {interacao.includes(op) ? "✓ " : ""}{op}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {etapa === 2 && (
          <div className="space-y-5">
            <h2 className="font-bold text-blue-900 text-lg">🛠 Autonomia e Higiene</h2>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nível de Independência</label>
              <div className="space-y-2">
                {[
                  { lab: "Dependência Total", val: 1, color: "border-red-400 bg-red-50 text-red-800" },
                  { lab: "Ajuda Física/Verbal", val: 2, color: "border-amber-400 bg-amber-50 text-amber-800" },
                  { lab: "Independência Parcial", val: 3, color: "border-blue-400 bg-blue-50 text-blue-800" },
                  { lab: "Independência Total", val: 4, color: "border-emerald-400 bg-emerald-50 text-emerald-800" },
                ].map(nivel => (
                  <button key={nivel.val} type="button" onClick={() => setAutonomiaNivel(nivel.val)}
                    className={"w-full px-4 py-3 rounded-xl text-sm font-medium border-2 transition text-left " +
                      (autonomiaNivel === nivel.val ? nivel.color : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    {autonomiaNivel === nivel.val ? "✓ " : ""}{nivel.lab}
                  </button>
                ))}
              </div>
            </div>
            <Toggle value={periodoMenstrual} onChange={setPeriodoMenstrual} label="Período Menstrual" icon="🩸"/>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Idas ao Banheiro</label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setIdasBanheiro(Math.max(0, idasBanheiro - 1))}
                  className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xl transition active:scale-95">−</button>
                <span className="text-3xl font-black text-blue-900 w-12 text-center">{idasBanheiro}</span>
                <button type="button" onClick={() => setIdasBanheiro(idasBanheiro + 1)}
                  className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl transition active:scale-95">+</button>
              </div>
            </div>
            <Toggle value={evacuou} onChange={setEvacuou} label="Evacuou" icon="✅"/>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">💧 Ingestão de Água</label>
              <div className="grid grid-cols-2 gap-2">
                {["Não bebeu água", "Menos de 200ml", "200ml", "400ml", "500ml"].map(op => (
                  <button key={op} type="button" onClick={() => setAguaIngestao(op)}
                    className={"px-4 py-3 rounded-xl text-sm font-medium border-2 transition text-left " +
                      (aguaIngestao === op ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    {aguaIngestao === op ? "✓ " : ""}{op}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {etapa === 3 && (
          <div className="space-y-5">
            <h2 className="font-bold text-blue-900 text-lg">🏀 Recreio e Socialização</h2>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Interação no Recreio</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["Brinca com pares", "Brinca sozinho", "Apenas observa", "Recusa interação"].map(op => (
                  <button key={op} type="button" onClick={() => toggleOpcao(socializacao, setSocializacao, op)}
                    className={"px-4 py-3 rounded-xl text-sm font-medium border-2 transition text-left " +
                      (socializacao.includes(op) ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    {socializacao.includes(op) ? "✓ " : ""}{op}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Atenção e Foco</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["Atenção mantida", "Distração frequente", "Necessitou apoio constante", "Foco excelente"].map(op => (
                  <button key={op} type="button" onClick={() => toggleOpcao(atencao, setAtencao, op)}
                    className={"px-4 py-3 rounded-xl text-sm font-medium border-2 transition text-left " +
                      (atencao.includes(op) ? "border-purple-600 bg-purple-50 text-purple-800 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    {atencao.includes(op) ? "✓ " : ""}{op}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lanche</label>
              <input type="text" value={lanche} onChange={e => setLanche(e.target.value)} placeholder="O que comeu no lanche?"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400"/>
            </div>
            <Toggle value={comeuTudo} onChange={setComeuTudo} label="Comeu tudo" icon="🍽️"/>
          </div>
        )}

        {etapa === 4 && (
          <div className="space-y-5">
            <h2 className="font-bold text-blue-900 text-lg">📖 Agenda e Recados</h2>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conteúdo de Sala</label>
              <textarea rows={3} value={atividadesSala} onChange={e => setAtividadesSala(e.target.value)}
                placeholder="O que foi trabalhado hoje em sala?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 resize-none"/>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tarefa de Casa</label>
              <textarea rows={2} value={tarefaCasa} onChange={e => setTarefaCasa(e.target.value)}
                placeholder="Páginas, matérias, atividades..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 resize-none"/>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-red-600">⚠️ Materiais / Avisos Urgentes</label>
              <textarea rows={2} value={materiaisPedir} onChange={e => setMateriaisPedir(e.target.value)}
                placeholder="Recados importantes para os pais..."
                className="w-full px-4 py-3 rounded-xl border-2 border-red-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 transition placeholder:text-slate-400 resize-none bg-red-50"/>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">🎉 Eventos Escolares</label>
              <textarea rows={2} value={eventosEscolares} onChange={e => setEventosEscolares(e.target.value)}
                placeholder="Aconteceu algum evento na escola? Como o aluno participou?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 resize-none"/>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observações Gerais</label>
              <textarea rows={3} value={obsGerais} onChange={e => setObsGerais(e.target.value)}
                placeholder="Outras observações do dia..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 resize-none"/>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Resumo</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {criancaSelecionada?.foto_url
                    ? <img src={criancaSelecionada.foto_url} alt={criancaSelecionada.nome} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{criancaSelecionada?.nome?.charAt(0) || "?"}</div>}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{criancaSelecionada?.nome}</p>
                  <p className="text-xs text-slate-400">{new Date().toLocaleDateString("pt-BR")} · AT: {atNome}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Ao enviar, o comunicado irá para a <span className="font-semibold text-blue-700">supervisora</span> revisar.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {etapa > 1 && (
          <button onClick={() => setEtapa(etapa - 1)}
            className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition">
            ← Anterior
          </button>
        )}
        {etapa < 4 ? (
          <button onClick={avancar}
            className="flex-grow h-12 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition active:scale-95">
            Continuar →
          </button>
        ) : (
          <button onClick={enviarFormulario} disabled={salvando}
            className="flex-grow h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition active:scale-95 disabled:opacity-50">
            {salvando ? "Enviando..." : "✓ Enviar Comunicado"}
          </button>
        )}
      </div>
    </div>
  );
}