import AtendimentoForm from "@/components/AtendimentoForm"

export default function NovoRegistroPage() {
  return (
    <section className="space-y-4">
      
      {/* Cabeçalho com a Identidade da Clínica e Largura Total Restaurada */}
      <div className="space-y-1.5 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-2">
          <span className="bg-blue-600 h-2 w-2 rounded-full animate-pulse"></span>
          <h1 className="text-2xl font-black text-blue-900 tracking-tight">Novo Registro</h1>
        </div>
        
        {/* Nome da Clínica em Degradê Colorido e Elegante */}
        <div className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
          ABA ABRAÇO - Núcleo de Intervenção Comportamental
        </div>
        
        <p className="text-slate-600">
          Olá! seja bem vinda novamente. A Clínica Abraço te deseja um excelente serviço.
        </p>
      </div>

      {/* Formulário Principal */}
      <AtendimentoForm />
      
    </section>
  )
}