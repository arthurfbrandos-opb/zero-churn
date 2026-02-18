import { toErrorMsg } from '@/lib/utils'
/**
 * GET /api/dom/payments?clientId=xxx&months=3
 *
 * Retorna transações Dom vinculadas a um cliente específico,
 * filtrando pelos documentos registrados em client_integrations.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { DomCredentials, fetchPaidTransactions, domDateToISO } from '@/lib/dom/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const clientId    = request.nextUrl.searchParams.get('clientId')
    const inicioParam = request.nextUrl.searchParams.get('inicio')
    const fimParam    = request.nextUrl.searchParams.get('fim')
    const months      = parseInt(request.nextUrl.searchParams.get('months') ?? '3')
    if (!clientId) return NextResponse.json({ error: 'clientId obrigatório' }, { status: 400 })

    // Documentos Dom vinculados a este cliente
    const { data: domIntegs } = await supabase
      .from('client_integrations')
      .select('id, credentials, label')
      .eq('client_id', clientId)
      .eq('type', 'dom_pagamentos')

    if (!domIntegs?.length) {
      return NextResponse.json({ transactions: [], documents: [] })
    }

    // Integração Dom da agência
    const { data: domInteg } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    if (!domInteg?.encrypted_key || domInteg.status !== 'active') {
      return NextResponse.json({ transactions: [], documents: [], error: 'Dom Pagamentos não configurado na agência' })
    }

    const domCreds = await decrypt<DomCredentials>(domInteg.encrypted_key)

    // Período: inicio/fim explícito OU últimos N meses
    const hoje       = new Date()
    const dataFim    = fimParam    ?? hoje.toISOString().slice(0, 10)
    const dataInicio = inicioParam ?? new Date(hoje.getFullYear(), hoje.getMonth() - months, 1)
      .toISOString().slice(0, 10)

    // Documentos limpos deste cliente
    const docs = domIntegs
      .map(ci => ({
        clean: (ci.credentials as { document?: string })?.document?.replace(/\D/g, '') ?? '',
        label: ci.label,
      }))
      .filter(d => d.clean)

    const docSet = new Set(docs.map(d => d.clean))

    // Busca transações e filtra por documento
    const allTxs = await fetchPaidTransactions(domCreds, dataInicio, dataFim)
    const matched = allTxs.filter(tx => {
      const doc = tx.customer_document?.replace(/\D/g, '')
      return doc && docSet.has(doc)
    })

    const transactions = matched.map(tx => ({
      id:           tx.id,
      data:         domDateToISO(tx.created_at),
      status:       tx.status,
      valorTotal:   tx.amount,
      valorLiquido: tx.liquid_amount,
      tipo:         tx.payment_method,
      parcelas:     tx.installments > 1 ? `${tx.installments}x` : null,
      cartao:       tx.card_brand ?? null,
      descricao:    tx.product_first ?? null,
      comprador:    tx.customer_name,
      documento:    tx.customer_document,
      email:        tx.customer_email,
    }))

    return NextResponse.json({ transactions, documents: docs })
  } catch (err) {
    const msg = toErrorMsg(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
