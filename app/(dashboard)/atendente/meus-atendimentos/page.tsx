'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { CalendarDays, Home, School, Clock, DollarSign } from 'lucide-react'

export default function MeusAtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // O id de login (auth) nem sempre e o mesmo id da linha em `atendentes`.
      let atendenteId: string | null = null
      const { data: porId } = await supabase.from('atendentes').select('id').eq('id', user.id).maybeSingle()
      if (porId) {
        atendenteId = porId.id
      } else {
        const { data: porUsuarioId } = await supabase.from('atendentes').select('id').eq('usuario_id', user.id).maybeSingle()
        if (porUsuarioId) {
          atendenteId = porUsuarioId.id
        } else if (user.email) {
          const { data: porEmail } = await supabase.from('atendentes').select('id').eq('email', user.email).maybeSingle()
          if (porEmail) atendenteId = porEmail.id
        }
      }

      if (!atendenteId) { setLoading(false); return }

      const mes = String(mesSelecionado).padStart(2, '0')
      const primeiroDia = `${anoSelecionado}-${mes}-01`
      const ultimoDia = `${anoSelecionado}-${mes}-31`

      const { data, error } = await supabase
        .from('atendimentos')
        .select('id, data, local, horas, valor_hora, valor_total, status, criancas(nome)')
        .eq('atendente_id', atendenteId)
        .gte('data', primeiroDia)
        .lte('data', ultimoDia)
        .order('data', { ascending: false })

      if (!error && data) setAtendimentos(data)
      setLoading(false)
    }
    carregar()
  }, [router, mesSelecionado, anoSelecionado])

  // Totalizadores
  const totais = useMemo(() => {
    const horas = atendimentos.reduce((acc, a) => acc + Number(a.horas || 0), 0)
    const total = atendimentos.reduce((acc, a) => acc + Number(a.valor_total || 0), 0)
    const pago = atendimentos.filter(a => String(a.status).toLowerCase() === 'pago')
      .reduce((acc, a) => acc + Number(a.valor_total || 0), 0)
    const pendente = total - pago
    return { horas, total, pago, pendente }
  }, [atendimentos])

  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ]

  const mesNome = meses[mesSelecionado - 1]

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">
              Meus Atendimentos
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            ABA Abraço — Núcleo de Intervenção Comportamental
          </p>
        </div>

        {/* Filtro mês/ano */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm self-start sm:self-auto">
          <CalendarDays size={16} className="text-slate-400"/>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(Number(e.target.value))}
            className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
          >
            {meses.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <span className="text-slate-300">|</span>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CARDS RESUMO */}
      {!loading && atendimentos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Atendimentos</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{atendimentos.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">{mesNome} {anoSelecionado}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Horas</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{totais.horas.toFixed(1)}h</p>
            <p className="text-xs text-slate-400 mt-0.5">trabalhadas</p>
          </div>
          <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Pendente</p>
            <p className="text-2xl font-black text-amber-500 mt-1">
              R$ {totais.pendente.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">a receber</p>
          </div>
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Pago</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              R$ {totais.pago.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">recebido</p>
          </div>
        </div>
      )}

      {/* LISTA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando atendimentos...</p>
        </div>
      ) : atendimentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-slate-400 font-medium">
            Nenhum atendimento em {mesNome} {anoSelecionado}.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile — cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {atendimentos.map((item) => {
              const pago = String(item.status).toLowerCase() === 'pago'
              return (
                <div key={item.id} className={`bg-white rounded-2xl border shadow-sm p-4 border-l-4
                  ${pago ? 'border-l-emerald-400' : 'border-l-amber-400'} border-slate-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {(item.criancas as any)?.nome ?? <span className="text-slate-400 italic">Criança não informada</span>}
                    </p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ml-2 shrink-0
                      ${pago ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {pago ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {item.local?.toLowerCase() === 'escola'
                      ? <School size={14} className="text-blue-500"/>
                      : <Home size={14} className="text-amber-500"/>}
                    <span className="text-xs text-slate-500 capitalize">{item.local}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-xs text-slate-400">Data</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {item.data?.split('T')[0].split('-').reverse().join('/')}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-xs text-slate-400">Horas</p>
                      <p className="text-xs font-bold text-blue-700 mt-0.5">{Number(item.horas).toFixed(2)}h</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">R$ {Number(item.valor_total).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop — tabela */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Criança</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Local</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Horas</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor/h</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atendimentos.map((item) => {
                    const pago = String(item.status).toLowerCase() === 'pago'
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {item.data?.split('T')[0].split('-').reverse().join('/')}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {(item.criancas as any)?.nome ?? <span className="text-slate-400 italic text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {item.local?.toLowerCase() === 'escola'
                              ? <School size={14} className="text-blue-500"/>
                              : <Home size={14} className="text-amber-500"/>}
                            <span className="capitalize text-slate-700">{item.local}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400"/>
                            <span className="font-medium text-slate-700">{Number(item.horas).toFixed(2)}h</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-semibold text-emerald-600 whitespace-nowrap">
                          R$ {Number(item.valor_hora || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 font-bold text-blue-700 whitespace-nowrap">
                          R$ {Number(item.valor_total || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                            ${pago
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {pago ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400">
                {atendimentos.length} registro{atendimentos.length !== 1 ? 's' : ''} em {mesNome} {anoSelecionado}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}