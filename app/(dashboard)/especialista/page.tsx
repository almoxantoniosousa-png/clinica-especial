"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function EspecialistaHomePage() {
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [criancas, setCriancas] = useState<any[]>([]);
  const [criancaSelecionada, setCriancaSelecionada] = useState<any>(null);
  const [sessaoAtiva, setSessaoAtiva] = useState(false);

  // Contadores DTT
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);
  const [tentativas, setTentativas] = useState<{tipo: "acerto"|"erro", hora: string}[]>([]);

  // Cronômetro
  const [segundos, setSegundos] = useState(0);
  const intervaloRef = useRef<any>(null);

  // Feedback
  const [feedback, setFeedback] = useState<{tipo:"sucesso"|"erro"; msg:string}|null>(null);
  const [salvando, setSalvando] = useState(false);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from("atendentes").select("nome, especialidade")
          .eq("email", user.email).maybeSingle();
        if (perfil) { setNome(perfil.nome); setEspecialidade(perfil.especialidade || "Especialista"); }
      }
      const { data } = await supabase.from("criancas").select("id, nome, foto_url").order("nome");
      setCriancas(data || []);
    }
    carregar();
  }, []);

  // Cronômetro
  useEffect(() => {
    if (sessaoAtiva) {
      intervaloRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
    } else {
      clearInterval(intervaloRef.current);
    }
    return () => clearInterval(intervaloRef.current);
  }, [sessaoAtiva]);

  function formatarTempo(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    return `${h > 0 ? h + "h " : ""}${String(m).padStart(2,"0")}m ${String(seg).padStart(2,"0")}s`;
  }

  function iniciarSessao() {
    if (!criancaSelecionada) {
      setFeedback({ tipo: "erro", msg: "Selecione a criança antes de iniciar!" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setSessaoAtiva(true);
    setAcertos(0); setErros(0); setTentativas([]); setSegundos(0);
  }

  function registrar(tipo: "acerto" | "erro") {
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (tipo === "acerto") setAcertos(a => a + 1);
    else setErros(e => e + 1);
    setTentativas(t => [...t, { tipo, hora }]);
  }

  const total = acertos + erros;
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const maestria = pct >= 80 && total >= 5;

  async function encerrarSessao() {
    setSessaoAtiva(false);
    setSalvando(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prontuarios").insert([{
      crianca_id: criancaSelecionada.id,
      autor_id: user?.id,
      tipo: "sessao_dtt",
      titulo: `Sessão DTT — ${new Date().toLocaleDateString("pt-BR")}`,
      conteudo: JSON.stringify({
        acertos, erros, total,
        percentual: pct,
        duracao_segundos: segundos,
        maestria,
        tentativas,
        especialidade,
      }),
      visivel_familia: false,
    }]);

    setSalvando(false);
    if (error) {
      setFeedback({ tipo: "erro", msg: "Erro ao salvar sessão: " + error.message });
    } else {
      setFeedback({ tipo: "sucesso", msg: `Sessão salva! ${acertos} acertos de ${total} tentativas (${pct}%)` });
    }
    setTimeout(() => setFeedback(null), 5000);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md bg-white p-0.5">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"/>
              <h1 className="text-xl md:text-2xl font-bold text-blue-900">
                Olá, {nome.split(" ")[0] || "Especialista"}!
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
              {especialidade} — Clínica Abraço
            </p>
          </div>
        </div>
        <div className="self-start sm:self-auto flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span className="text-xs font-medium text-slate-600 capitalize">{hoje}</span>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* SELEÇÃO DA CRIANÇA */}
      {!sessaoAtiva && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-800">Nova Sessão DTT</h2>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Selecione a criança</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {criancas.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCriancaSelecionada(c)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left
                    ${criancaSelecionada?.id === c.id
                      ? "border-purple-600 bg-purple-50"
                      : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                    {c.foto_url
                      ? <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                          {c.nome.charAt(0)}
                        </div>}
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">{c.nome}</span>
                  {criancaSelecionada?.id === c.id && <span className="ml-auto text-purple-600">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={iniciarSessao}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition active:scale-95"
          >
            ▶ Iniciar Sessão
          </button>
        </div>
      )}

      {/* SESSÃO ATIVA */}
      {sessaoAtiva && (
        <div className="space-y-4">

          {/* Cabeçalho da sessão */}
          <div className="bg-purple-900 rounded-2xl p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-400 flex-shrink-0">
                {criancaSelecionada?.foto_url
                  ? <img src={criancaSelecionada.foto_url} alt={criancaSelecionada.nome} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-purple-700 flex items-center justify-center font-bold text-sm">
                      {criancaSelecionada?.nome.charAt(0)}
                    </div>}
              </div>
              <div>
                <p className="font-bold text-sm">{criancaSelecionada?.nome}</p>
                <p className="text-xs text-purple-300">Sessão em andamento</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-purple-200">{formatarTempo(segundos)}</p>
              <p className="text-xs text-purple-400">duração</p>
            </div>
          </div>

          {/* Alerta de maestria */}
          {maestria && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-bold text-emerald-800">Critério de Maestria Atingido!</p>
                <p className="text-xs text-emerald-600">{pct}% de acertos em {total} tentativas — meta dominada!</p>
              </div>
            </div>
          )}

          {/* Placar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-600 uppercase">Acertos</p>
              <p className="text-4xl font-black text-emerald-600 mt-1">{acertos}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase">Total</p>
              <p className="text-4xl font-black text-slate-700 mt-1">{total}</p>
              <p className="text-sm font-bold text-blue-600">{pct}%</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-red-600 uppercase">Erros</p>
              <p className="text-4xl font-black text-red-500 mt-1">{erros}</p>
            </div>
          </div>

          {/* Barra de progresso */}
          {total > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-600">Acertos {pct}%</span>
                <span className="text-slate-400">Meta: 80%</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Botões de registro */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => registrar("acerto")}
              className="h-24 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xl rounded-2xl transition shadow-lg shadow-emerald-200"
            >
              ✓ ACERTO
            </button>
            <button
              onClick={() => registrar("erro")}
              className="h-24 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black text-xl rounded-2xl transition shadow-lg shadow-red-200"
            >
              ✕ ERRO
            </button>
          </div>

          {/* Histórico da sessão */}
          {tentativas.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Últimas tentativas</p>
              <div className="flex flex-wrap gap-1.5">
                {tentativas.slice(-20).reverse().map((t, i) => (
                  <span key={i} className={`text-xs font-bold px-2 py-1 rounded-lg
                    ${t.tipo === "acerto" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {t.tipo === "acerto" ? "✓" : "✕"} {t.hora}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Encerrar sessão */}
          <button
            onClick={encerrarSessao}
            disabled={salvando || total === 0}
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition active:scale-95 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "⏹ Encerrar e Salvar Sessão"}
          </button>
        </div>
      )}

      {/* ATALHOS — só aparece quando não tem sessão ativa */}
      {!sessaoAtiva && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/especialista/prontuarios", label: "Prontuários",  icon: "📋", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { href: "/especialista/relatorios",  label: "Relatórios",   icon: "📝", color: "bg-purple-50 border-purple-200 text-purple-700" },
            { href: "/adm/mural",                label: "Mural",        icon: "📢", color: "bg-amber-50 border-amber-200 text-amber-700" },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 font-semibold text-sm transition hover:scale-105 active:scale-95 ${a.color}`}>
              <span className="text-2xl">{a.icon}</span>
              <span>{a.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}