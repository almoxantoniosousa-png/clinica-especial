"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginWithPassword } from "@/app/actions";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

const initialState = { error: null };

export function LoginForm() {
  const [state, formAction] = useActionState(loginWithPassword, initialState);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [feedbackRecuperacao, setFeedbackRecuperacao] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false);
  const [modoBloqueio, setModoBloqueio] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [feedbackSenha, setFeedbackSenha] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") setModoBloqueio(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function salvarNovaSenha() {
    if (!novaSenha || novaSenha.length < 6) {
      setFeedbackSenha({ tipo: "erro", msg: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setFeedbackSenha({ tipo: "erro", msg: "As senhas não coincidem." });
      return;
    }
    setSalvandoSenha(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);
    if (error) {
      setFeedbackSenha({ tipo: "erro", msg: "Erro ao redefinir: " + error.message });
    } else {
      setFeedbackSenha({ tipo: "sucesso", msg: "Senha redefinida com sucesso! Redirecionando..." });
      setTimeout(() => { window.location.href = "/"; }, 2000);
    }
  }

  async function handleEsqueciSenha() {
    if (!emailRecuperacao.trim()) {
      setFeedbackRecuperacao({ tipo: "erro", msg: "Digite seu e-mail para continuar." });
      return;
    }
    setEnviandoRecuperacao(true);
    setFeedbackRecuperacao(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperacao, {
      redirectTo: window.location.origin + "/login",
    });
    setEnviandoRecuperacao(false);
    if (error) {
      setFeedbackRecuperacao({ tipo: "erro", msg: "Erro ao enviar: " + error.message });
    } else {
      setFeedbackRecuperacao({ tipo: "sucesso", msg: "E-mail enviado! Verifique sua caixa de entrada." });
    }
  }

  return (
    <div className="space-y-3 w-full">

      {/* REDEFINIR SENHA — aparece quando usuário clica no link do e-mail */}
      {modoBloqueio && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-blue-700">🔐 Redefina sua senha</p>
            <p className="text-xs text-blue-500 mt-0.5">Escolha uma nova senha para sua conta.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nova senha</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Confirmar senha</label>
            <input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmaSenha}
              onChange={e => setConfirmaSenha(e.target.value)}
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {feedbackSenha && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border
              ${feedbackSenha.tipo === "sucesso"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : "bg-red-50 border-red-100 text-red-600"}`}>
              <span>{feedbackSenha.tipo === "sucesso" ? "✓" : "✕"}</span>
              {feedbackSenha.msg}
            </div>
          )}

          <button
            type="button"
            onClick={salvarNovaSenha}
            disabled={salvandoSenha}
            className="w-full h-11 bg-blue-900 hover:bg-blue-800 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
          >
            {salvandoSenha ? "Salvando..." : "Salvar nova senha"}
          </button>
        </div>
      )}

      {/* FORMULÁRIO DE LOGIN */}
      {!modoBloqueio && !mostrarRecuperacao && (
        <form action={formAction} className="space-y-3">

          {/* EMAIL */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              E-mail
            </label>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
              </svg>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nome@clinicaabraco.com"
                required
                className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder:text-slate-400 transition shadow-sm"
              />
            </div>
          </div>

          {/* SENHA */}
          <div className="space-y-1">
            <label htmlFor="senha" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Senha
            </label>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <input
                id="senha"
                name="senha"
                type="password"
                placeholder="••••••••"
                required
                className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder:text-slate-400 transition shadow-sm"
              />
            </div>
          </div>

          {/* ERRO LOGIN */}
          {state?.error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <p className="text-xs font-semibold text-red-600">{state.error}</p>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setMostrarRecuperacao(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
            >
              Esqueci minha senha
            </button>
          </div>

          <SubmitButton />
        </form>
      )}

      {/* PAINEL DE RECUPERAÇÃO DE SENHA */}
      {!modoBloqueio && mostrarRecuperacao && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-700">Recuperar senha</p>
            <p className="text-xs text-slate-400">Digite seu e-mail para receber o link de redefinição.</p>
          </div>

          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
            </svg>
            <input
              type="email"
              placeholder="seu@email.com"
              value={emailRecuperacao}
              onChange={(e) => setEmailRecuperacao(e.target.value)}
              className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder:text-slate-400 transition"
            />
          </div>

          {/* FEEDBACK RECUPERAÇÃO */}
          {feedbackRecuperacao && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border
              ${feedbackRecuperacao.tipo === "sucesso"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : "bg-red-50 border-red-100 text-red-600"}`}>
              <span>{feedbackRecuperacao.tipo === "sucesso" ? "✓" : "✕"}</span>
              {feedbackRecuperacao.msg}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setMostrarRecuperacao(false); setFeedbackRecuperacao(null); setEmailRecuperacao(""); }}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm
                font-semibold hover:bg-slate-50 active:scale-95 transition"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleEsqueciSenha}
              disabled={enviandoRecuperacao}
              className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm
                font-semibold active:scale-95 transition disabled:opacity-50"
            >
              {enviandoRecuperacao ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Enviando...
                </span>
              ) : "Enviar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-bold
        text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Entrando...
        </span>
      ) : "Entrar"}
    </button>
  );
}