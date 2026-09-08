"use client";

import logoClinica from "../../public/logo.png";
import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-500 via-blue-400 to-blue-300 flex flex-col md:flex-row">

      {/* Círculos decorativos de fundo */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none"/>

      {/* Painel esquerdo — só decorativo, com marca d'água (logo + símbolo da psicologia) */}
      <div className="hidden md:flex flex-1 relative z-10 items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-5 max-h-full">
          <img src="/logo.png" alt="" aria-hidden="true"
            className="w-52 h-52 object-contain pointer-events-none select-none"
            style={{
              opacity: 0.16,
              filter: "grayscale(100%)",
              maskImage: "radial-gradient(circle, black 55%, transparent 78%)",
              WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 78%)",
            }}
          />
          <span
            aria-hidden="true"
            className="text-white font-serif leading-none pointer-events-none select-none"
            style={{ fontSize: "20rem", fontWeight: 400, opacity: 0.09 }}
          >
            Ψ
          </span>
        </div>
      </div>

      {/* Painel direito — login */}
      <div className="relative w-full md:w-[480px] shrink-0 h-full bg-blue-100 flex flex-col justify-start md:justify-center py-8 px-8 md:px-12 shadow-2xl overflow-y-auto">

        {/* Marca d'água — mesmo padrão usado no dashboard */}
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center" style={{ zIndex: 0 }}>
          <img src="/logo.png" alt="" aria-hidden="true"
            className="w-56 h-56 object-contain"
            style={{
              opacity: 0.08,
              filter: "grayscale(100%)",
              maskImage: "radial-gradient(circle, black 55%, transparent 78%)",
              WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 78%)",
            }}
          />
        </div>

        {/* Logo — mesma posição de sempre, agora no topo do painel de login */}
        <div className="relative z-10 flex flex-col items-center gap-1.5 mb-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-lg p-1.5 border border-slate-100">
            <img src={logoClinica.src} alt="Logo Clínica Abraço" className="w-full h-full object-contain"/>
          </div>
          <div className="text-center">
            <p className="text-slate-800 font-black text-base tracking-tight leading-tight">Clínica Abraço</p>
            <p className="text-slate-400 text-xs mt-0.5">ABA — Intervenção Comportamental</p>
          </div>
        </div>

        <div className="relative z-10 space-y-1">
          <p className="text-sm font-bold text-slate-700">Acessar sistema</p>
          <p className="text-xs text-slate-400 mb-2">Use suas credenciais da clínica.</p>
          <LoginForm />
        </div>

        {/* Aviso legal */}
        <div className="relative z-10 mt-3 pt-3 border-t border-blue-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aviso legal</p>
          <p className="text-[10px] leading-snug text-slate-400">
            Este ambiente é de uso exclusivo da equipe da Clínica Abraço e pode conter informações confidenciais e protegidas por sigilo profissional, nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). É proibido divulgar, copiar ou utilizar as informações aqui contidas caso você não seja a pessoa autorizada.
          </p>
          <p className="text-[10px] text-slate-300 mt-2">
            Acesso restrito · Clínica Abraço © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
