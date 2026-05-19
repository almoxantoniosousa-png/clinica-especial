"use client";

// Importação da logo (dando dois passos para trás até a pasta public)
import logoClinica from "../../public/logo.png";

// 🟢 CAMINHO DEFINITIVO: Dois passos para trás sai de 'login', sai de 'app' e entra em 'components'
import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-blue-100 p-4">
      
      {/* CARD BRANCO */}
      <div className="w-full max-w-[360px] bg-white p-8 rounded-[32px] shadow-lg flex flex-col items-center">
        
        {/* LOGO DA CLÍNICA */}
        <div className="mb-4 w-[200px] h-[200px] flex items-center justify-center overflow-hidden">
          <img 
            src={logoClinica.src} 
            alt="Logo Clínica Abraço" 
            className="w-full h-full object-contain"
          />
        </div>

        {/* TÍTULO PRINCIPAL */}
        <h1 className="text-3xl font-bold text-slate-800 mb-6 tracking-tight text-center">
          Clínica Abraço
        </h1>

        {/* FORMULÁRIO PADRÃO RETORNADO */}
        <LoginForm />

      </div>
    </div>
  );
}