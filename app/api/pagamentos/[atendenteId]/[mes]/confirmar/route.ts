import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ atendenteId: string; mes: string }> }
) {
  try {
    // Aguarda os parâmetros resolverem (exigência do Next.js)
    const { atendenteId, mes } = await params
    const { dataPagamento } = await req.json()

    // mes vem no formato "2026/05"
    const [ano, mesNum] = mes.split('/')
    const inicioMes = `${ano}-${mesNum}-01`
    const ultimoDia = new Date(Number(ano), Number(mesNum), 0).getDate()
    const fimMes = `${ano}-${mesNum}-${ultimoDia}`

    // Atualiza registros do atendente no mês
    const { error: updateError } = await supabase
      .from('financeiro')
      .update({
        status: 'Pago',
        data_pagamento: dataPagamento ?? new Date().toISOString(),
      })
      .eq('atendente_id', atendenteId)
      .gte('data', inicioMes)
      .lte('data', fimMes)

    if (updateError) {
      return NextResponse.json({ message: 'Erro ao confirmar pagamento', error: updateError }, { status: 500 })
    }

    // Busca registros atualizados
    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .eq('atendente_id', atendenteId)
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

    const totalHoras = registros.reduce((acc, curr) => acc + curr.horas, 0)
    const totalValor = registros.reduce((acc, curr) => acc + curr.valor_total, 0)

    const resultado = {
      atendente_id: atendenteId,
      mes_referencia: mes,
      total_horas: totalHoras,
      total_valor: totalValor,
      status_pagamento: 'Pago',
      data_pagamento: dataPagamento ?? new Date().toISOString(),
      registros
    }

    return NextResponse.json(resultado)
  } catch (error) {
    return NextResponse.json(
      { message: 'Erro ao confirmar pagamento', error },
      { status: 500 }
    )
  }
}