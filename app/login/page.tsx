"use client";

import logoClinica from "../../public/logo.png";
import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-blue-500 via-blue-400 to-blue-300 flex flex-col md:flex-row"
    >

      {/* Nuvens (SVG, cada uma com um formato diferente) */}
      {[
        {
          left: "5%", top: "4%", width: 100, opacity: 0.15,
          shape: <>
            <rect x="10" y="30" width="120" height="26" rx="13"/>
            <circle cx="30" cy="30" r="18"/>
            <circle cx="55" cy="20" r="24"/>
            <circle cx="85" cy="22" r="20"/>
            <circle cx="108" cy="30" r="16"/>
          </>,
        },
        {
          left: "61%", top: "9%", width: 130, opacity: 0.18,
          shape: <>
            <rect x="15" y="28" width="90" height="24" rx="12"/>
            <circle cx="35" cy="28" r="20"/>
            <circle cx="60" cy="16" r="22"/>
            <circle cx="85" cy="24" r="18"/>
          </>,
        },
        {
          left: "13%", top: "32%", width: 120, opacity: 0.17,
          shape: <>
            <rect x="5" y="32" width="130" height="20" rx="10"/>
            <circle cx="20" cy="32" r="14"/>
            <circle cx="45" cy="22" r="18"/>
            <circle cx="70" cy="18" r="20"/>
            <circle cx="95" cy="20" r="16"/>
            <circle cx="120" cy="30" r="14"/>
          </>,
        },
        {
          left: "47%", top: "18%", width: 95, opacity: 0.13,
          shape: <>
            <rect x="12" y="26" width="100" height="28" rx="14"/>
            <circle cx="28" cy="26" r="16"/>
            <circle cx="50" cy="14" r="20"/>
            <circle cx="78" cy="20" r="22"/>
            <circle cx="100" cy="28" r="14"/>
          </>,
        },
        {
          left: "3%", top: "62%", width: 115, opacity: 0.17,
          shape: <>
            <rect x="8" y="30" width="115" height="22" rx="11"/>
            <circle cx="24" cy="30" r="17"/>
            <circle cx="48" cy="24" r="19"/>
            <circle cx="75" cy="16" r="23"/>
            <circle cx="102" cy="26" r="16"/>
          </>,
        },
        {
          left: "56%", top: "56%", width: 105, opacity: 0.15,
          shape: <>
            <rect x="18" y="30" width="80" height="20" rx="10"/>
            <circle cx="30" cy="30" r="15"/>
            <circle cx="52" cy="18" r="19"/>
            <circle cx="78" cy="26" r="15"/>
            <circle cx="95" cy="32" r="10"/>
          </>,
        },
        {
          left: "18%", top: "86%", width: 118, opacity: 0.14,
          shape: <>
            <rect x="10" y="30" width="120" height="26" rx="13"/>
            <circle cx="30" cy="30" r="18"/>
            <circle cx="55" cy="20" r="24"/>
            <circle cx="85" cy="22" r="20"/>
            <circle cx="108" cy="30" r="16"/>
          </>,
        },
        {
          left: "60%", top: "80%", width: 88, opacity: 0.11,
          shape: <>
            <rect x="15" y="28" width="90" height="24" rx="12"/>
            <circle cx="35" cy="28" r="20"/>
            <circle cx="60" cy="16" r="22"/>
            <circle cx="85" cy="24" r="18"/>
          </>,
        },
      ].map((c, i) => (
        <svg key={i} className="absolute pointer-events-none" viewBox="0 0 140 60" fill="white"
          style={{ left: c.left, top: c.top, width: c.width, opacity: c.opacity, filter: "blur(3.5px)" }}>
          {c.shape}
        </svg>
      ))}

      {/* Círculos decorativos de fundo */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none"/>

      {/* Painel esquerdo — só decorativo, com marca d'água (logo + símbolo da psicologia) */}
      <div className="hidden md:flex flex-1 relative z-10 items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-4 max-h-full">
          <img src="/logo.png" alt="" aria-hidden="true"
            className="w-44 h-44 object-contain pointer-events-none select-none"
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
            style={{ fontSize: "17rem", fontWeight: 400, opacity: 0.09 }}
          >
            Ψ
          </span>
        </div>
      </div>

      {/* Painel direito — login */}
      <div className="relative w-full md:w-[480px] shrink-0 h-full bg-blue-100 flex flex-col justify-center py-4 px-8 md:px-12 shadow-2xl overflow-y-auto">

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
        <div className="relative z-10 flex flex-col items-center gap-1 mb-2">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-lg p-1 border border-slate-100">
            <img src={logoClinica.src} alt="Logo Clínica Abraço" className="w-full h-full object-contain"/>
          </div>
          <div className="text-center">
            <p className="text-slate-800 font-black text-sm tracking-tight leading-tight">Clínica Abraço</p>
            <p className="text-slate-400 text-[11px] mt-0.5">ABA — Intervenção Comportamental</p>
          </div>
        </div>

        <div className="relative z-10 space-y-0.5">
          <p className="text-sm font-bold text-slate-700">Acessar sistema</p>
          <p className="text-xs text-slate-400 mb-1">Use suas credenciais da clínica.</p>
          <LoginForm />
        </div>

        {/* Aviso legal */}
        <div className="relative z-10 mt-2 pt-2 border-t border-blue-200 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Aviso legal</p>
          <p className="text-[13px] leading-snug text-slate-400 text-justify">
            Este ambiente é de uso exclusivo da equipe da Clínica Abraço e pode conter informações confidenciais e protegidas por sigilo profissional, nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). É proibido divulgar, copiar ou utilizar as informações aqui contidas caso você não seja a pessoa autorizada.
          </p>
          <p className="text-[11px] text-slate-300 mt-1">
            Acesso restrito · Clínica Abraço © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
