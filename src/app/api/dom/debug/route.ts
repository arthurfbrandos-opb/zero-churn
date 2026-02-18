/**
 * GET /api/dom/debug?id=xxx  → transação específica (raw)
 * GET /api/dom/debug         → primeiras 5 transações com valores brutos
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { DomCredentials, getTransaction, listTransactions } from '@/lib/dom/client'

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
      return NextResponse.json({
        raw: tx,
        diagnostico: {
          amount_raw:        tx.amount,
          liquid_amount_raw: tx.liquid_amount,
          amount_div100:     tx.amount / 100,
          liquid_div100:     tx.liquid_amount / 100,
          status:            tx.status,
          customer_name:     tx.customer?.name,
          customer_document: tx.customer?.document,
          customer_doc_type: tx.customer?.document_type,
          customer_email:    tx.customer?.email,
          produto:           tx.product_first,
          parcelas:          tx.installments,
          data_criacao:      tx.created_at,
          data_liquidacao:   tx.liquidation?.[0]?.date,
        }
      })
    }

    const result = await listTransactions(creds, { per_page: 5 })
    const sample = (result.data ?? []).slice(0, 5).map(tx => ({
      id:                tx.id,
      status:            tx.status,
      amount_raw:        tx.amount,
      liquid_amount_raw: tx.liquid_amount,
      amount_div100:     tx.amount / 100,
      liquid_div100:     tx.liquid_amount / 100,
      customer_name:     tx.customer?.name,
      customer_doc:      tx.customer?.document,
      customer_doc_type: tx.customer?.document_type,
      customer_email:    tx.customer?.email,
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
