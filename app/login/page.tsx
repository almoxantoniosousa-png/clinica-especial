"use client";

import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">

      {/* FUNDO DECORATIVO */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-3xl"/>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200 rounded-full opacity-30 blur-3xl"/>
      </div>

      {/* CARD */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-6">

        {/* LOGO */}
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
          <img
            src="/logo.png"
            alt="Logo Clínica Abraço"
            className="w-full h-full object-cover"
          />
        </div>

        {/* TÍTULO */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-blue-900 tracking-tight">
            Clínica Abraço
          </h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            ABA — Núcleo de Intervenção Comportamental
          </p>
        </div>

        {/* DIVISOR */}
        <div className="w-full h-px bg-slate-100"/>

        {/* FORMULÁRIO */}
        <div className="w-full">
          <LoginForm />
        </div>

        {/* RODAPÉ */}
        <p className="text-xs text-slate-400 text-center">
          Sistema exclusivo para uso interno da clínica.
        </p>
      </div>
    </div>
  );
}