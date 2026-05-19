'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { CalendarDays, Home, School, Clock } from 'lucide-react'

export default function MeusAtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados para o filtro de Mês e Ano
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  
  const router = useRouter()

  useEffect(() => {
    async function validarECarregar() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const primeiroDia = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`
      const ultimoDia = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-31`

      const { data, error } = await supabase
        .from('atendimentos')
        .select(`
          id,
          data,
          local,
          horas,
          valor_hora,
          valor_total,
          status
        `)
        .eq('atendente_id', user.id)
        .gte('data', primeiroDia)
        .lte('data', ultimoDia)
        .order('data', { ascending: false })

      if (!error && data) setAtendimentos(data)
      setLoading(false)
    }

    validarECarregar()
  }, [router, mesSelecionado, anoSelecionado])

  if (loading) {
    return <div className="p-10 text-center font-bold text-blue-900 animate-pulse">Carregando seus atendimentos...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      
      {/* 🟢 CABEÇALHO ELEGANTE, DISCRETO E COLORIDO COM A MARCA DA CLÍNICA */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 h-2 w-2 rounded-full animate-pulse"></span>
            <h1 className="text-2xl font-black text-blue-900 tracking-tight">Meus Atendimentos</h1>
          </div>
          
          {/* 🌈 Nome da Clínica com degradê colorido, moderno e sutil */}
          <div className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            ABA ABRAÇO - Núcleo de Intervenção Comportamental
          </div>
          
          <p className="text-sm text-slate-500 font-medium">
            Consulte seu histórico de serviços prestados
          </p>
        </div>

        {/* SELETORES DE MÊS E ANO */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200 self-start md:self-end">
          <CalendarDays size={18} className="text-slate-400" />
          
          <select 
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(Number(e.target.value))}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value={1}>Janeiro</option>
            <option value={2}>Fevereiro</option>
            <option value={3}>Março</option>
            <option value={4}>Abril</option>
            <option value={5}>Maio</option>
            <option value={6}>Junho</option>
            <option value={7}>Julho</option>
            <option value={8}>Agosto</option>
            <option value={9}>Setembro</option>
            <option value={10}>Outubro</option>
            <option value={11}>Novembro</option>
            <option value={12}>Dezembro</option>
          </select>

          <span className="text-slate-300">|</span>

          <select 
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-100 bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50/70 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Local</th>
              <th className="px-4 py-3 text-left">Horas</th>
              <th className="px-4 py-3 text-left">Valor Hora</th>
              <th className="px-4 py-3 text-left">Valor Total</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {atendimentos.map((item) => {
              const statusNormalizado = String(item.status || '').toLowerCase()
              const ehPago = statusNormalizado === 'pago' || statusNormalizado === 'confirmado'

              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition text-sm text-slate-800">
                  <td className="px-4 py-3 font-semibold">
                    {item.data?.split("T")[0].split("-").reverse().join("/")}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <div className="flex items-center space-x-2 font-medium">
                      {item.local?.toLowerCase() === 'escola' ? (
                        <School size={16} className="text-blue-500" />
                      ) : (
                        <Home size={16} className="text-amber-500" />
                      )}
                      <span>{item.local}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center space-x-1">
                      <Clock size={14} className="text-slate-400" />
                      <span>{Number(item.horas).toFixed(2)}h</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-emerald-600 font-bold">
                    R$ {Number(item.valor_hora || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-blue-600 font-bold">
                    R$ {Number(item.valor_total || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      ehPago ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ehPago ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              )
            })}
            
            {atendimentos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                  Nenhum atendimento registrado neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}