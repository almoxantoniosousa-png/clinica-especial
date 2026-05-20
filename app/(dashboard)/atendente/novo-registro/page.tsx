import AtendimentoForm from "@/components/AtendimentoForm"
import Image from "next/image"

export default function NovoRegistroPage() {
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
            <img
              src="/logo.png"
              alt="Logo Clínica Abraço"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">
                Novo Registro
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
              ABA Abraço — Núcleo de Intervenção Comportamental
            </p>
          </div>
        </div>

        {/* Data atual */}
        <div className="self-start sm:self-auto flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span className="text-xs font-medium text-slate-600 capitalize">{hoje}</span>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <AtendimentoForm />

    </div>
  )
}