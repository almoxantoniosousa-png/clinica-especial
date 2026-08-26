'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { CalendarDays, Home, School, Building2, Clock, DollarSign, Pencil, X, Trash2 } from 'lucide-react'
import { updateAtendimento, deleteAtendimento } from '@/app/actions'

export default function MeusAtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const router = useRouter()

  const [criancas, setCriancas] = useState<any[]>([])
  const [atendenteId, setAtendenteId] = useState<string | null>(null)
  const [editando, setEditando] = useState<any | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erroEdicao, setErroEdicao] = useState('')
  const [excluindoItem, setExcluindoItem] = useState<any | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState('')

  async function carregar(idParaCarregar?: string) {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // O id de login (auth) nem sempre e o mesmo id da linha em `atendentes`.
    let id: string | null = idParaCarregar || null
    if (!id) {
      const { data: porId } = await supabase.from('atendentes').select('id').eq('id', user.id).maybeSingle()
      if (porId) {
        id = porId.id
      } else {
        const { data: porUsuarioId } = await supabase.from('atendentes').select('id').eq('usuario_id', user.id).maybeSingle()
        if (porUsuarioId) {
          id = porUsuarioId.id
        } else if (user.email) {
          const { data: porEmail } = await supabase.from('atendentes').select('id').eq('email', user.email).maybeSingle()
          if (porEmail) id = porEmail.id
        }
      }
      setAtendenteId(id)
    }

    if (!id) { setLoading(false); return }

    const mes = String(mesSelecionado).padStart(2, '0')
    const primeiroDia = `${anoSelecionado}-${mes}-01`
    const ultimoDia = `${anoSelecionado}-${mes}-31`

    const { data, error } = await supabase
      .from('atendimentos')
      .select('id, data, local, horas, valor_hora, valor_total, status, crianca_id, crianca_texto, ocorrencia, criancas(nome)')
      .eq('atendente_id', id)
      .gte('data', primeiroDia)
      .lte('data', ultimoDia)
      .order('data', { ascending: false })

    if (!error && data) setAtendimentos(data)
    setLoading(false)
  }

  useEffect(() => {
    carregar(atendenteId || undefined)
  }, [router, mesSelecionado, anoSelecionado])

  useEffect(() => {
    supabase.from('criancas').select('id, nome').order('nome').then(({ data }) => {
      if (data) setCriancas(data)
    })
  }, [])

  function abrirEdicao(item: any) {
    setErroEdicao('')
    setEditando({
      id: item.id,
      data: item.data?.split('T')[0] || item.data,
      local: item.local,
      valorHora: item.valor_hora ? String(item.valor_hora) : '',
      horas: item.horas ? String(item.horas) : '',
      criancaId: item.crianca_id || '',
      criancaTexto: item.crianca_texto || '',
      ocorrencia: item.ocorrencia || '',
    })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvandoEdicao(true)
    setErroEdicao('')
    const res = await updateAtendimento(editando.id, {
      data: editando.data,
      local: editando.local,
      valorHora: editando.local === 'clinica' ? Number(editando.valorHora || 0) : undefined,
      horas: Number(editando.horas || 0),
      crianca_id: editando.criancaId || null,
      crianca_texto: editando.criancaId ? '' : editando.criancaTexto,
      ocorrencia: editando.ocorrencia,
    })
    setSalvandoEdicao(false)
    if (res && !res.success) {
      setErroEdicao(res.error || 'Erro ao salvar.')
      return
    }
    setEditando(null)
    carregar(atendenteId || undefined)
  }

  async function confirmarExclusao() {
    if (!excluindoItem) return
    setExcluindo(true)
    setErroExclusao('')
    const res = await deleteAtendimento(excluindoItem.id)
    setExcluindo(false)
    if (res && !res.success) {
      setErroExclusao(res.error || 'Erro ao excluir.')
      return
    }
    setExcluindoItem(null)
    carregar(atendenteId || undefined)
  }

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
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br from-violet-900 to-violet-600 shadow-lg shadow-violet-900/20">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" aria-hidden />
            <p className="relative text-xs font-semibold text-violet-200 uppercase tracking-wide">Atendimentos</p>
            <p className="relative text-2xl font-black mt-1 text-violet-300">{atendimentos.length}</p>
            <p className="relative text-xs text-violet-200/80 mt-0.5">{mesNome} {anoSelecionado}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br from-blue-950 to-blue-700 shadow-lg shadow-blue-900/20">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" aria-hidden />
            <p className="relative text-xs font-semibold text-blue-200 uppercase tracking-wide">Horas</p>
            <p className="relative text-2xl font-black mt-1 text-blue-300">{totais.horas.toFixed(1)}h</p>
            <p className="relative text-xs text-blue-200/80 mt-0.5">trabalhadas</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br from-yellow-900 to-yellow-700 shadow-lg shadow-yellow-900/20">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" aria-hidden />
            <p className="relative text-xs font-semibold text-yellow-200 uppercase tracking-wide">Pendente</p>
            <p className="relative text-2xl font-black mt-1 text-yellow-300">
              R$ {totais.pendente.toFixed(2)}
            </p>
            <p className="relative text-xs text-yellow-200/80 mt-0.5">a receber</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br from-teal-900 to-teal-600 shadow-lg shadow-teal-900/20">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" aria-hidden />
            <p className="relative text-xs font-semibold text-teal-200 uppercase tracking-wide">Pago</p>
            <p className="relative text-2xl font-black mt-1 text-teal-300">
              R$ {totais.pago.toFixed(2)}
            </p>
            <p className="relative text-xs text-teal-200/80 mt-0.5">recebido</p>
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
                      {(item.criancas as any)?.nome ?? (item as any).crianca_texto ?? <span className="text-slate-400 italic">Criança não informada</span>}
                    </p>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                        ${pago ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {pago ? 'Pago' : 'Pendente'}
                      </span>
                      {!pago && (
                        <>
                          <button onClick={() => abrirEdicao(item)}
                            className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center hover:bg-blue-100 transition">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { setErroExclusao(''); setExcluindoItem(item) }}
                            className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {item.local?.toLowerCase() === 'escola'
                      ? <School size={14} className="text-blue-500"/>
                      : item.local?.toLowerCase() === 'clinica'
                      ? <Building2 size={14} className="text-purple-500"/>
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
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"></th>
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
                          {(item.criancas as any)?.nome ?? (item as any).crianca_texto ?? <span className="text-slate-400 italic text-xs">—</span>}
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
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          {!pago && (
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => abrirEdicao(item)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline transition">
                                <Pencil size={13} /> Editar
                              </button>
                              <button onClick={() => { setErroExclusao(''); setExcluindoItem(item) }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 hover:underline transition">
                                <Trash2 size={13} /> Excluir
                              </button>
                            </div>
                          )}
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

      {/* MODAL DE EDIÇÃO */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Editar atendimento</h2>
                <p className="text-xs text-slate-400">Corrija os dados do registro — ele continua pendente de pagamento.</p>
              </div>
              <button onClick={() => setEditando(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              {erroEdicao && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroEdicao}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Data</label>
                  <input type="date" value={editando.data} onChange={(e) => setEditando({ ...editando, data: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Horas trabalhadas</label>
                  <input type="number" step="0.25" min="0.25" value={editando.horas}
                    onChange={(e) => setEditando({ ...editando, horas: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Local</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['casa', 'escola', 'clinica'] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setEditando({ ...editando, local: l })}
                      className={`h-10 rounded-xl border-2 text-xs font-bold capitalize transition
                        ${editando.local === l ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {editando.local === 'clinica' && (
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Valor por hora (R$)</label>
                  <input type="number" step="0.01" min="0.01" value={editando.valorHora}
                    onChange={(e) => setEditando({ ...editando, valorHora: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              <div>
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Criança</label>
                <select value={editando.criancaId}
                  onChange={(e) => setEditando({ ...editando, criancaId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">
                    {editando.criancaTexto ? `Texto livre: ${editando.criancaTexto}` : 'Selecione...'}
                  </option>
                  {criancas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Ocorrência / relato</label>
                <textarea rows={3} value={editando.ocorrencia}
                  onChange={(e) => setEditando({ ...editando, ocorrencia: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0">
              <button onClick={() => setEditando(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdicao}
                className="h-10 px-4 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
                {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {excluindoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Excluir este registro?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {excluindoItem.data?.split('T')[0].split('-').reverse().join('/')} · {excluindoItem.local} · {Number(excluindoItem.horas).toFixed(2)}h
                </p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            {erroExclusao && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{erroExclusao}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setExcluindoItem(null); setErroExclusao('') }}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}