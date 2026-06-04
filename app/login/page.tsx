"use client";

import logoClinica from "../../public/logo.png";
import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-5">

      {/* Círculos decorativos de fundo */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none"/>

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Topo do card — gradiente com logo */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 px-8 pt-8 pb-6 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-lg p-1.5">
            <img src={logoClinica.src} alt="Logo Clínica Abraço" className="w-full h-full object-contain"/>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-black text-white tracking-tight">Clínica Abraço</h1>
            <p className="text-blue-300 text-xs mt-0.5">ABA — Intervenção Comportamental</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="px-8 py-6 space-y-1">
          <p className="text-sm font-bold text-slate-700">Acessar sistema</p>
          <p className="text-xs text-slate-400 mb-4">Use suas credenciais da clínica.</p>
          <LoginForm />
        </div>

        {/* Rodapé */}
        <div className="px-8 pb-6 text-center">
          <p className="text-[11px] text-slate-300">
            Acesso restrito · Clínica Abraço © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
