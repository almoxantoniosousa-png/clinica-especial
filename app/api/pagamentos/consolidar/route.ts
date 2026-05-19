import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { mesReferencia } = await req.json()

    // mesReferencia vem no formato "2026/05"
    const [ano, mes] = mesReferencia.split('/')
    const inicioMes = `${ano}-${mes}-01`
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate()
    const fimMes = `${ano}-${mes}-${ultimoDia}`

    // Busca registros do mês
    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .gte('data', inicioMes)
      .lte('data', fimMes)

    if (error) {
      return NextResponse.json({ message: 'Erro ao buscar dados', error }, { status: 500 })
    }

    const registros = (data ?? []).map(r => ({
      ...r,
      horas: r.horas ? Number(r.horas) : 0,
      valor: r.valor ? Number(r.valor) : 0,
      valor_total: r.valor_total
        ? Number(r.valor_total)
        : (r.horas && r.valor ? Number(r.horas) * Number(r.valor) : 0)
    }))

    // Soma horas e valores com segurança
    const totalHoras = registros.reduce((acc, curr) => acc + curr.horas, 0)
    const totalValor = registros.reduce((acc, curr) => acc + curr.valor_total, 0)

    const status_pagamento = registros.every(d => d.status?.trim().toLowerCase() === 'pago')
      ? 'Pago'
      : 'Pendente'

    const resultado = {
      mes_referencia: mesReferencia,
      total_horas: totalHoras,
      total_valor: totalValor,
      status_pagamento,
      atendente_id: registros[0]?.atendente_id ?? null,
      registros // agora retorna também os registros
    }

    return NextResponse.json(resultado)
  } catch (error) {
    return NextResponse.json(
      { message: 'Erro ao consolidar pagamentos', error },
      { status: 500 }
    )
  }
}
