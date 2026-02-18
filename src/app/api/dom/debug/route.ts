/**
 * GET /api/dom/debug?id=xxx  → transação específica (raw)
 * GET /api/dom/debug         → primeiras 5 transações com valores brutos
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { DomCredentials, DomTransaction, getTransaction, listTransactions } from '@/lib/dom/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integ } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    if (!integ?.encrypted_key)
      return NextResponse.json({ error: 'Dom Pagamentos não configurado' }, { status: 400 })

    const creds = await decrypt<DomCredentials>(integ.encrypted_key)
    const id    = request.nextUrl.searchParams.get('id')

    if (id) {
      const tx = await getTransaction(creds, id)
      return NextResponse.json({ raw: tx })
    }

    const result = await listTransactions(creds, { per_page: 5 })
    const sample = (result.data ?? []).slice(0, 5).map((tx: DomTransaction) => ({
      id:                tx.id,
      status:            tx.status,
      status_details:    tx.status_details,
      amount_raw:        tx.amount,
      liquid_amount_raw: tx.liquid_amount,
      customer_name:     tx.customer_name,
      customer_document: tx.customer_document,
      customer_email:    tx.customer_email,
      customer_phone:    tx.customer_phone,
      produto:           tx.product_first,
      parcelas:          tx.installments,
      created_at:        tx.created_at,
    }))

    return NextResponse.json({ total: result.total, sample })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
