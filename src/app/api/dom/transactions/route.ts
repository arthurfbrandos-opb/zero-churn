import { toErrorMsg } from '@/lib/utils'
/**
 * GET /api/dom/transactions?clientId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Retorna transações Dom Pagamentos de um cliente específico
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { fetchPaidTransactions, DomCredentials } from '@/lib/dom/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const startDate = searchParams.get('startDate') ?? ''
    const endDate   = searchParams.get('endDate')   ?? ''

    // Credenciais Dom da agência
    const { data: integ } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    if (!integ?.encrypted_key || integ.status !== 'active')
      return NextResponse.json({ transactions: [], status: 'not_configured' })

    const creds = await decrypt<DomCredentials>(integ.encrypted_key)
    const transactions = await fetchPaidTransactions(creds, startDate, endDate)

    // Usa liquid_amount (valor líquido após taxas)
    const normalized = transactions.map(t => ({
      ...t,
      amount:        t.amount,
      liquid_amount: t.liquid_amount,
    }))

    return NextResponse.json({ transactions: normalized })
  } catch (err) {
    const msg = toErrorMsg(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
