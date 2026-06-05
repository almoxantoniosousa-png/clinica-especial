"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const HORAS = [
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00",
];

export default function AgendaEspecialistaPage() {
  const router = useRouter();
  const [autor, setAutor] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalAberto, setModalAberto] = useState(false);
  const [novoHora, setNovoHora] = useState("08:00");
  const [novoCriancaId, setNovoCriancaId] = useState("");
  const [novoTipo, setNovoTipo] = useState("sessao");
  const [novoObservacao, setNovoObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from("atendentes").select("id, nome, especialidade").eq("email", user.email).maybeSingle();
      if (perfil) setAutor(perfil);
      const { data: cs } = await supabase.from("criancas").select("id, nome").order("nome");
      setCriancas(cs || []);
    }
    carregar();
  }, []);

  useEffect(() => {
    if (!autor) return;
    async function carregarAgenda() {
      setLoading(true);
      const { data } = await supabase
        .from("agenda")
        .select("*, criancas(id, nome)")
        .eq("especialista_id", autor.id)
        .eq("data", diaSelecionado)
        .order("hora");
      setAgendamentos(data || []);
      setLoading(false);
    }
    carregarAgenda();
  }, [autor, diaSelecionado]);

  const diasSemana = useMemo(() => {
    const hoje = new Date();
    const dow = hoje.getDay(); // 0=dom, 1=seg...6=sab
    const diffSegunda = dow === 0 ? -6 : 1 - dow;
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + diffSegunda);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(segunda);
      d.setDate(segunda.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  function nomeDia(dataStr: string) {
    return new Date(dataStr + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }

  function numeroDia(dataStr: string) {
    return new Date(dataStr + "T12:00:00").getDate();
  }

  function isHoje(dataStr: string) {
    return dataStr === new Date().toISOString().slice(0, 10);
  }

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function salvarAgendamento() {
    if (!novoCriancaId || !novoHora) {
      mostrarFeedback("erro", "Selecione a crianca e o horario.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("agenda").insert([{
      especialista_id: autor.id,
      crianca_id: novoCriancaId,
      data: diaSelecionado,
      hora: novoHora,
      tipo: novoTipo,
      observacao: novoObservacao,
      status: "agendado",
    }]);
    setSalvando(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao agendar: " + error.message);
    } else {
      mostrarFeedback("sucesso", "Agendamento salvo!");
      setModalAberto(false);
      setNovoCriancaId("");
      setNovoObservacao("");
      setNovoHora("08:00");
      const { data } = await supabase
        .from("agenda").select("*, criancas(id, nome)")
        .eq("especialista_id", autor.id).eq("data", diaSelecionado).order("hora");
      setAgendamentos(data || []);
    }
  }

  async function alterarStatus(id: string, status: string) {
    await supabase.from("agenda").update({ status }).eq("id", id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  function corStatus(status: string) {
    if (status === "realizado") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "cancelado") return "bg-red-100 text-red-700 border-red-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  function labelTipo(tipo: string) {
    if (tipo === "sessao") return "Sessao";
    if (tipo === "avaliacao") return "Avaliacao";
    if (tipo === "reuniao") return "Reuniao";
    return tipo;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-blue-900">Minha Agenda</h1>
          <p className="text-xs text-slate-400">{autor?.nome || "Especialista"}</p>
        </div>
        <button onClick={() => setModalAberto(true)}
          className="ml-auto h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">
          + Agendar
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "V" : "X"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {diasSemana.map(dia => (
            <button key={dia} onClick={() => setDiaSelecionado(dia)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 w-12 py-2 rounded-xl transition
                ${dia === diaSelecionado ? "bg-blue-900 text-white" : isHoje(dia) ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-500 hover:bg-slate-50"}`}>
              <span className="text-xs font-semibold uppercase">{nomeDia(dia)}</span>
              <span className="text-lg font-black">{numeroDia(dia)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2 px-1">
          {new Date(diaSelecionado + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Carregando agenda...</p>
        </div>
      ) : agendamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📅</span>
          <p className="text-sm text-slate-400 font-medium">Nenhum agendamento para este dia.</p>
          <button onClick={() => setModalAberto(true)}
            className="mt-1 h-9 px-4 bg-blue-900 text-white text-xs font-bold rounded-xl">
            + Agendar atendimento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agendamentos.map(ag => (
            <div key={ag.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-4">
              <div className="flex-shrink-0 text-center">
                <p className="text-lg font-black text-blue-900">{ag.hora?.slice(0, 5)}</p>
                <p className="text-xs text-slate-400">{labelTipo(ag.tipo)}</p>
              </div>
              <div className="w-px bg-slate-100"/>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800 text-sm truncate">{ag.criancas?.nome || "Nao identificado"}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${corStatus(ag.status)}`}>
                    {ag.status === "agendado" ? "Agendado" : ag.status === "realizado" ? "Realizado" : "Cancelado"}
                  </span>
                </div>
                {ag.observacao && <p className="text-xs text-slate-500">{ag.observacao}</p>}
                {ag.status === "agendado" && (
                  <div className="flex gap-2">
                    <button onClick={() => alterarStatus(ag.id, "realizado")}
                      className="h-7 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition">
                      Realizado
                    </button>
                    <button onClick={() => alterarStatus(ag.id, "cancelado")}
                      className="h-7 px-3 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Novo Agendamento</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Crianca</label>
                <select value={novoCriancaId} onChange={e => setNovoCriancaId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario</label>
                  <select value={novoHora} onChange={e => setNovoHora(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</label>
                  <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="sessao">Sessao</option>
                    <option value="avaliacao">Avaliacao</option>
                    <option value="reuniao">Reuniao</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observacao</label>
                <input type="text" value={novoObservacao} onChange={e => setNovoObservacao(e.target.value)}
                  placeholder="Opcional..."
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvarAgendamento} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Agendar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}