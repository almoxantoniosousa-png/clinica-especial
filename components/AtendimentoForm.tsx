'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { createAtendimento } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Home, School, Building2, Calendar, Clock, FileText, Baby, MapPin, DollarSign } from 'lucide-react'
import { hojeLocal } from '@/lib/dataUtils'

export default function AtendimentoForm() {
  const [local, setLocal] = useState<'casa' | 'escola' | 'clinica'>('casa')
  const [valorHoraClinica, setValorHoraClinica] = useState('')
  const [nomeAtendente, setNomeAtendente] = useState('')
  const [localDetalhe, setLocalDetalhe] = useState('')
  const [horaEntrada, setHoraEntrada] = useState('')
  const [horaSaida, setHoraSaida] = useState('')
  const [horasTrabalhadas, setHorasTrabalhadas] = useState(0)
  const [data, setData] = useState('')
  const [criancaId, setCriancaId] = useState('')
  const [nomeCrianca, setNomeCrianca] = useState('')
  const [criancas, setCriancas] = useState<any[]>([])
  const [criancaTexto, setCriancaTexto] = useState('')
  const [criancaLivre, setCriancaLivre] = useState(false)
  const [criancaSelecao, setCriancaSelecao] = useState('')
  const [ocorrencia, setOcorrencia] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [totalHorasAcumuladas, setTotalHorasAcumuladas] = useState(0)
  const [totalValorAcumulado, setTotalValorAcumulado] = useState(0)
  const router = useRouter()

  const VALOR_HORA = 30.00

  useEffect(() => {
    async function inicializarDados() {
      const { data: list } = await supabase.from('criancas').select('*').order('nome')
      if (list) setCriancas(list)

      setData(hojeLocal())

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // O id de login (auth) nem sempre é o mesmo id da linha em `atendentes`.
        let perfil: { id: string; nome: string } | null = null
        const { data: porId } = await supabase.from('atendentes').select('id, nome').eq('id', user.id).maybeSingle()
        if (porId) {
          perfil = porId
        } else {
          const { data: porUsuarioId } = await supabase.from('atendentes').select('id, nome').eq('usuario_id', user.id).maybeSingle()
          if (porUsuarioId) {
            perfil = porUsuarioId
          } else if (user.email) {
            const { data: porEmail } = await supabase.from('atendentes').select('id, nome').eq('email', user.email).maybeSingle()
            if (porEmail) perfil = porEmail
          }
        }
        if (perfil?.nome) setNomeAtendente(perfil.nome)

        // Acumulado pendente
        if (perfil?.id) {
          const { data: historico } = await supabase
            .from('atendimentos')
            .select('horas, valor_total')
            .eq('atendente_id', perfil.id)
            .eq('status', 'pendente')

          if (historico) {
            const somaHoras = historico.reduce((acc, curr) => acc + Number(curr.horas || 0), 0)
            const somaValor = historico.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0)
            setTotalHorasAcumuladas(somaHoras)
            setTotalValorAcumulado(somaValor)
          }
        }
      }
    }
    inicializarDados()
  }, [])

  useEffect(() => {
    if (horaEntrada && horaSaida) {
      const [hE, mE] = horaEntrada.split(':').map(Number)
      const [hS, mS] = horaSaida.split(':').map(Number)
      let minutos = (hS * 60 + mS) - (hE * 60 + mE)
      if (minutos < 0) minutos += 24 * 60
      setHorasTrabalhadas(Number((minutos / 60).toFixed(2)))
    } else {
      setHorasTrabalhadas(0)
    }
  }, [horaEntrada, horaSaida])

  const valorHoraEfetivo = local === 'clinica' ? (Number(valorHoraClinica) || 0) : VALOR_HORA
  const valorTotalCalculado = horasTrabalhadas * valorHoraEfetivo

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const criancaOk = local === 'clinica' ? (criancaId || criancaTexto.trim()) : criancaId
    if (!criancaOk || horasTrabalhadas <= 0 || !data || (local !== 'clinica' && !localDetalhe)) {
      setMsg({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios.' })
      return
    }
    if (local === 'clinica' && valorHoraEfetivo <= 0) {
      setMsg({ type: 'error', text: 'Informe o valor por hora do atendimento na clínica.' })
      return
    }
    setLoading(true)
    setMsg(null)

    const detalheLocal = local === 'clinica' ? '' : ` | ${local === 'escola' ? 'Escola' : 'Responsável'}: ${localDetalhe}`
    const relatoCompleto = `Acompanhante: ${nomeAtendente}${detalheLocal} | Entrada: ${horaEntrada} | Saída: ${horaSaida} | ${ocorrencia}`

    const res = await createAtendimento({
      crianca_id: criancaId || null,
      crianca_texto: criancaId ? '' : criancaTexto.trim(),
      nome_crianca: nomeCrianca,
      data,
      horas: horasTrabalhadas,
      local,
      valorHora: local === 'clinica' ? valorHoraEfetivo : undefined,
      ocorrencia: relatoCompleto
    })

    setLoading(false)

    if (res && !res.success && res.error) {
      setMsg({ type: 'error', text: `Erro ao salvar: ${res.error}` })
    } else {
      setMsg({ type: 'success', text: 'Atendimento registrado com sucesso!' })
      setOcorrencia('')
      setLocalDetalhe('')
      setValorHoraClinica('')
      setHoraEntrada('')
      setHoraSaida('')
      setCriancaId('')
      setNomeCrianca('')
      setTimeout(() => router.push('/atendente/meus-atendimentos'), 1500)
    }
  }

  return (
    <div className="w-full space-y-5">

      {/* CARDS ACUMULADOS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Horas acumuladas</p>
            <p className="text-2xl font-black mt-0.5">{totalHorasAcumuladas.toFixed(2)}h</p>
            <p className="text-xs text-slate-500 mt-0.5">Pendentes de pagamento</p>
          </div>
          <div className="bg-slate-700 p-2.5 rounded-xl">
            <Clock size={20} className="text-blue-400" />
          </div>
        </div>

        <div className="bg-blue-900 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">A receber</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">
              R$ {totalValorAcumulado.toFixed(2)}
            </p>
            <p className="text-xs text-blue-300 mt-0.5">Aguardando financeiro</p>
          </div>
          <div className="bg-blue-800 p-2.5 rounded-xl">
            <DollarSign size={20} className="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* FEEDBACK */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${msg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'}`}
        >
          <span>{msg.type === 'success' ? '✓' : '✕'}</span>
          {msg.text}
        </div>
      )}

      {/* FORMULÁRIO */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">

        {/* ATENDENTE (automático, editável se necessário) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Acompanhante
          </label>
          <div className="flex items-center gap-3 h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
              {nomeAtendente ? nomeAtendente.charAt(0).toUpperCase() : '?'}
            </div>
            <input
              type="text"
              value={nomeAtendente}
              onChange={(e) => setNomeAtendente(e.target.value)}
              placeholder="Nome do acompanhante..."
              className="flex-1 bg-transparent text-sm font-medium text-slate-700 focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* LOCAL DO ATENDIMENTO */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Local do atendimento
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => { setLocal('casa'); setLocalDetalhe(''); setCriancaLivre(false); setCriancaTexto(''); if (criancaSelecao === '__ADAPTADO__' || criancaSelecao === '__LIVRE__') { setCriancaSelecao(''); setCriancaId('') } }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition select-none
                ${local === 'casa'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <div className={`p-2 rounded-lg ${local === 'casa' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
                <Home size={18} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Casa</p>
                <p className="text-xs text-emerald-600 font-semibold">R$ 30,00/h</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setLocal('escola'); setLocalDetalhe(''); setCriancaLivre(false); setCriancaTexto(''); if (criancaSelecao === '__ADAPTADO__' || criancaSelecao === '__LIVRE__') { setCriancaSelecao(''); setCriancaId('') } }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition select-none
                ${local === 'escola'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <div className={`p-2 rounded-lg ${local === 'escola' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
                <School size={18} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Escola</p>
                <p className="text-xs text-emerald-600 font-semibold">R$ 30,00/h</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setLocal('clinica'); setLocalDetalhe('') }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition select-none
                ${local === 'clinica'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <div className={`p-2 rounded-lg ${local === 'clinica' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
                <Building2 size={18} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Clínica</p>
                <p className="text-xs text-slate-400 font-semibold">Valor livre</p>
              </div>
            </button>
          </div>

          {local === 'clinica' && (
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <DollarSign size={13} /> Valor por hora (R$)
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="Ex: 20,00"
                value={valorHoraClinica}
                onChange={(e) => setValorHoraClinica(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition"
              />
            </div>
          )}
        </div>

        {/* CAMPO DINÂMICO */}
        {local !== 'clinica' && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <MapPin size={13} />
            {local === 'escola' ? 'Nome da escola' : 'Nome do responsável'}
          </label>
          <input
            type="text"
            required
            placeholder={local === 'escola' ? 'Ex: Escola Primeiro Passo' : 'Ex: Mãe / Tio da criança'}
            value={localDetalhe}
            onChange={(e) => setLocalDetalhe(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition"
          />
        </div>
        )}

        {/* HORÁRIOS E DATA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <Clock size={13} /> Entrada
            </label>
            <input
              type="time"
              required
              value={horaEntrada}
              onChange={(e) => setHoraEntrada(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <Clock size={13} /> Saída
            </label>
            <input
              type="time"
              required
              value={horaSaida}
              onChange={(e) => setHoraSaida(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <Calendar size={13} /> Data
            </label>
            <input
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* CRIANÇA */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <Baby size={13} /> Criança
            {local === 'clinica' && <span className="normal-case text-slate-400 font-normal">(opcional se for atendimento adaptado)</span>}
          </label>

          {criancaLivre ? (
            <div className="flex gap-2">
              <input
                type="text"
                required
                autoFocus
                placeholder='Ex: "Adaptado", cobertura geral...'
                value={criancaTexto}
                onChange={(e) => setCriancaTexto(e.target.value)}
                className="flex-1 h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition"
              />
              <button
                type="button"
                onClick={() => { setCriancaLivre(false); setCriancaTexto(''); setCriancaSelecao('') }}
                className="px-3 text-xs font-semibold text-slate-400 hover:text-slate-600 shrink-0"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <select
              required={local !== 'clinica'}
              value={criancaSelecao}
              onChange={(e) => {
                const v = e.target.value
                setCriancaSelecao(v)
                if (v === '__ADAPTADO__') {
                  setCriancaId(''); setNomeCrianca(''); setCriancaTexto('Adaptado')
                } else if (v === '__LIVRE__') {
                  setCriancaId(''); setNomeCrianca(''); setCriancaTexto(''); setCriancaLivre(true)
                } else {
                  setCriancaId(v); setCriancaTexto('')
                  const sel = criancas.find(c => c.id === v)
                  setNomeCrianca(sel ? sel.nome : '')
                }
              }}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">Selecione a criança...</option>
              {criancas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
              {local === 'clinica' && <option value="__ADAPTADO__">🔧 Adaptado (atendimento geral)</option>}
              {local === 'clinica' && <option value="__LIVRE__">+ Escrever outro...</option>}
            </select>
          )}
        </div>

        {/* OCORRÊNCIA */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <FileText size={13} /> Ocorrência / Relato do dia
          </label>
          <textarea
            rows={3}
            placeholder="Observações relevantes sobre o atendimento..."
            value={ocorrencia}
            onChange={(e) => setOcorrencia(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition resize-none"
          />
        </div>

        {/* RESUMO DO REGISTRO */}
        {horasTrabalhadas > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Resumo deste registro</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">
                {Math.floor(horasTrabalhadas)}h {Math.round((horasTrabalhadas % 1) * 60)}min trabalhados
              </p>
              <p className="text-xs text-emerald-600">R$ {valorHoraEfetivo.toFixed(2)}/h</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-slate-400">Valor do registro</p>
              <p className="text-2xl font-black text-emerald-700">R$ {valorTotalCalculado.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* BOTÃO ENVIAR */}
        <button
          type="submit"
          disabled={loading || horasTrabalhadas <= 0}
          className="w-full h-12 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-bold
            text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Salvando...
            </span>
          ) : 'Enviar Registro'}
        </button>
      </form>
    </div>
  )
}