'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { createAtendimento } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Home, School, Calendar, Clock, FileText, Baby, User, MapPin, DollarSign } from 'lucide-react'

export default function AtendimentoForm() {
  const [local, setLocal] = useState<'casa' | 'escola'>('casa')
  const [nomeAtendente, setNomeAtendente] = useState('')
  const [localDetalhe, setLocalDetalhe] = useState('') 
  const [horaEntrada, setHoraEntrada] = useState('')
  const [horaSaida, setHoraSaida] = useState('')
  const [horasTrabalhadas, setHorasTrabalhadas] = useState(0)
  const [data, setData] = useState('')
  const [criancaId, setCriancaId] = useState('')
  const [nomeCrianca, setNomeCrianca] = useState('')
  const [criancas, setCriancas] = useState<any[]>([])
  const [ocorrencia, setOcorrencia] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  // 🟢 Estados para o Acumulado da Atendente
  const [totalHorasAcumuladas, setTotalHorasAcumuladas] = useState(0)
  const [totalValorAcumulado, setTotalValorAcumulado] = useState(0)

  const VALOR_HORA = 30.00

  // Carrega dados iniciais e o histórico acumulado
  useEffect(() => {
    async function inicializarDados() {
      // 1. Carrega crianças
      const { data: list } = await supabase.from('criancas').select('*').order('nome')
      if (list) setCriancas(list)
      
      setData(new Date().toISOString().split('T')[0])

      // 2. Busca o usuário logado para calcular o acumulado pendente
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: historico } = await supabase
          .from('atendimentos')
          .select('horas, valor_total')
          .eq('atendente_id', user.id)
          .eq('status', 'pendente') // Puxa apenas o que ela ainda tem para receber

        if (historico) {
          const somaHoras = historico.reduce((acc, curr) => acc + Number(curr.horas || 0), 0)
          const somaValor = historico.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0)
          setTotalHorasAcumuladas(somaHoras)
          setTotalValorAcumulado(somaValor)
        }
      }
    }
    inicializarDados()
  }, [])

  // Lógica de cálculo de horas do registro atual (Entrada vs Saída)
  useEffect(() => {
    if (horaEntrada && horaSaida) {
      const [hEntrada, mEntrada] = horaEntrada.split(':').map(Number)
      const [hSaida, mSaida] = horaSaida.split(':').map(Number)

      const minutosEntrada = hEntrada * 60 + mEntrada
      let minutosSaida = hSaida * 60 + mSaida

      if (minutosSaida < minutosEntrada) {
        minutosSaida += 24 * 60
      }

      const diferencaMinutos = minutosSaida - minutosEntrada
      const horasFinais = diferencaMinutos / 60
      setHorasTrabalhadas(Number(horasFinais.toFixed(2)))
    } else {
      setHorasTrabalhadas(0)
    }
  }, [horaEntrada, horaSaida])

  const valorTotalCalculado = horasTrabalhadas * VALOR_HORA

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!criancaId || horasTrabalhadas <= 0 || !data || !nomeAtendente || !localDetalhe) {
      setMsg({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios.' })
      return
    }

    setLoading(true)
    setMsg(null)

    const relatoCompleto = `Atendente: ${nomeAtendente} | ${local === 'escola' ? 'Escola' : 'Responsável'}: ${localDetalhe} | Entrada: ${horaEntrada} às Saída: ${horaSaida} | ${ocorrencia}`

    const res = await createAtendimento({
      crianca_id: criancaId,
      nome_crianca: nomeCrianca,
      data,
      horas: horasTrabalhadas,
      local,
      ocorrencia: relatoCompleto
    })

    setLoading(false)

    if (res && !res.success && res.error) {
      setMsg({ type: 'error', text: `Erro ao salvar: ${res.error}` })
    } else {
      setMsg({ type: 'success', text: 'Atendimento registrado com sucesso!' })
      setOcorrencia('')
      setTimeout(() => router.push('/atendente/meus-atendimentos'), 1500)
    }
  }

  return (
    <div className="w-full space-y-6">
      
      {/* 🟢 BLOCO DE ACUMULADOS VISÍVEL PARA A ATENDENTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card de Horas Acumuladas */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl text-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Horas Acumuladas (Mês)</p>
            <p className="text-2xl font-black">{totalHorasAcumuladas.toFixed(2)}h</p>
            <p className="text-xs text-slate-400">Total de horas não pagas</p>
          </div>
          <div className="bg-slate-700/50 p-3 rounded-lg text-blue-400">
            <Clock size={24} />
          </div>
        </div>

        {/* Card de Valor a Receber */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-4 rounded-xl text-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Valor a Receber</p>
            <p className="text-2xl font-black text-emerald-400">R$ {totalValorAcumulado.toFixed(2)}</p>
            <p className="text-xs text-blue-300">Aguardando baixa do financeiro</p>
          </div>
          <div className="bg-blue-800/40 p-3 rounded-lg text-emerald-400">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Alertas de Retorno */}
      {msg && (
        <div className={`p-4 rounded-md text-sm border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6 border border-gray-100">
        
        {/* NOME DO ATENDENTE */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
            <User size={16} className="text-slate-400" />
            <span>Nome do Atendente</span>
          </label>
          <input 
            type="text" 
            required
            placeholder="Digite seu nome completo" 
            value={nomeAtendente} 
            onChange={(e) => setNomeAtendente(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
          />
        </div>

        {/* LOCAL DO ATENDIMENTO */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Local do Atendimento</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => { setLocal('casa'); setLocalDetalhe(''); }}
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition select-none ${local === 'casa' ? 'border-blue-600 bg-blue-50/40 text-blue-900' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${local === 'casa' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Home size={22} />
                </div>
                <div>
                  <p className="font-bold text-sm sm:text-base">Casa</p>
                  <p className="text-xs text-emerald-600 font-semibold">R$ 30,00/h</p>
                </div>
              </div>
              <input type="radio" checked={local === 'casa'} onChange={() => {}} className="h-4 w-4 text-blue-600" />
            </div>

            <div 
              onClick={() => { setLocal('escola'); setLocalDetalhe(''); }}
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition select-none ${local === 'escola' ? 'border-blue-600 bg-blue-50/40 text-blue-900' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${local === 'escola' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <School size={22} />
                </div>
                <div>
                  <p className="font-bold text-sm sm:text-base">Escola</p>
                  <p className="text-xs text-emerald-600 font-semibold">R$ 30,00/h</p>
                </div>
              </div>
              <input type="radio" checked={local === 'escola'} onChange={() => {}} className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>

        {/* CAMPO DINÂMICO DE ACORDO COM O LOCAL */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
            <MapPin size={16} className="text-slate-400" />
            <span>{local === 'escola' ? 'Nome da Escola' : 'Nome do Responsável na Casa'}</span>
          </label>
          <input 
            type="text" 
            required
            placeholder={local === 'escola' ? "Ex: Escola Primeiro Passo" : "Ex: Mãe da criança / Tio"} 
            value={localDetalhe} 
            onChange={(e) => setLocalDetalhe(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
          />
        </div>

        {/* HORÁRIOS DE ENTRADA, SAÍDA E DATA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
              <Clock size={16} className="text-slate-400" />
              <span>Hora de Entrada</span>
            </label>
            <input 
              type="time" 
              required
              value={horaEntrada} 
              onChange={(e) => setHoraEntrada(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
              <Clock size={16} className="text-slate-400" />
              <span>Hora de Saída</span>
            </label>
            <input 
              type="time" 
              required
              value={horaSaida} 
              onChange={(e) => setHoraSaida(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
              <Calendar size={16} className="text-slate-400" />
              <span>Data</span>
            </label>
            <input 
              type="date" 
              required
              value={data} 
              onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
            />
          </div>
        </div>

        {/* SELEÇÃO DA CRIANÇA */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
            <Baby size={16} className="text-slate-400" />
            <span>Criança</span>
          </label>
          <select
            required
            value={criancaId}
            onChange={(e) => {
              setCriancaId(e.target.value)
              const selected = criancas.find(c => c.id === e.target.value)
              setNomeCrianca(selected ? selected.nome : '')
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
          >
            <option value="">Selecione a criança...</option>
            {criancas.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* RELATO LIVRE */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
            <FileText size={16} className="text-slate-400" />
            <span>Ocorrência / Relato do Dia</span>
          </label>
          <textarea 
            rows={3}
            placeholder="Alguma observação relevante sobre o atendimento..."
            value={ocorrencia} 
            onChange={(e) => setOcorrencia(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
          />
        </div>

        {/* CARD RESUMO DO ATENDIMENTO ATUAL */}
        {horasTrabalhadas > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tempo Contabilizado Neste Registro</p>
              <p className="text-lg font-bold text-slate-800">
                {Math.floor(horasTrabalhadas)}h e {Math.round((horasTrabalhadas % 1) * 60)}min trabalhados
              </p>
              <p className="text-xs text-emerald-600 font-medium">Cálculo baseado em R$ 30,00/h</p>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
              <p className="text-xs text-slate-400 font-medium">Valor do Registro</p>
              <p className="text-2xl font-black text-emerald-700">R$ {valorTotalCalculado.toFixed(2)}</p>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || horasTrabalhadas <= 0}
          className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-3 px-4 rounded-md transition duration-200 disabled:opacity-50"
        >
          {loading ? 'Processando e Salvando...' : 'Enviar Novo Registro'}
        </button>
      </form>
    </div>
  )
}