/**
 * POST /api/webhooks/dom/{agencyId}
 *   → Recebe eventos Dom Pagamentos em tempo real
 *
 * GET  /api/webhooks/dom/{agencyId}
 *   → Página de status (testa se o webhook está ativo)
 *     Retorna JSON para fácil verificação no browser ou curl
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  DomWebhookPayload,
  DomTransaction,
  DOM_HIGH_SEVERITY_EVENTS,
  DOM_MEDIUM_SEVERITY_EVENTS,
  DOM_EVENT_LABELS,

} from '@/lib/dom/client'

// ── GET — status para testar ───────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const { agencyId } = await params
  const supabase = await createAdminClient()

  // Verifica se a integração existe e está ativa
  const { data: integ } = await supabase
    .from('agency_integrations')
    .select('status')
    .eq('agency_id', agencyId)
    .eq('type', 'dom_pagamentos')
    .maybeSingle()

  if (!integ) {
    return NextResponse.json({
      ok: false,
      status: 'not_configured',
      message: 'Integração Dom Pagamentos não encontrada para esta agência.',
    }, { status: 404 })
  }

  if (integ.status !== 'active') {
    return NextResponse.json({
      ok: false,
      status: 'inactive',
      message: 'Integração Dom Pagamentos está inativa. Ative nas configurações.',
    }, { status: 403 })
  }

  // Último evento recebido
  const { data: lastAlert } = await supabase
    .from('alerts')
    .select('message, metadata, created_at')
    .eq('agency_id', agencyId)
    .contains('metadata', { source: 'dom_pagamentos' })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    ok:     true,
    status: 'active',
    message: '✅ Webhook Dom Pagamentos ativo e pronto para receber eventos.',
    last_event: lastAlert ? {
      event:       (lastAlert.metadata as Record<string, string>)?.event ?? 'desconhecido',
      message:     lastAlert.message,
      received_at: lastAlert.created_at,
    } : null,
    instructions: {
      method: 'POST',
      url:    `(esta URL)`,
      tip:    'Configure esta URL no painel Dom Pagamentos para receber eventos em tempo real.',
    },
  })
}

// ── POST — recebe evento ───────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const { agencyId } = await params
  const supabase = await createAdminClient()

  // Verifica se a integração está ativa para esta agência
  const { data: integ } = await supabase
    .from('agency_integrations')
    .select('status')
    .eq('agency_id', agencyId)
    .eq('type', 'dom_pagamentos')
    .maybeSingle()

  if (!integ || integ.status !== 'active') {
    // Retorna 200 para não gerar reenvios, mas registra o problema
    return NextResponse.json({ received: true, warning: 'integration_inactive' })
  }

  // Parse do payload
  let payload: DomWebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ received: true, warning: 'invalid_json' })
  }

  const { event, data } = payload
  if (!event) return NextResponse.json({ received: true, warning: 'missing_event' })

  const transaction = data as unknown as DomTransaction
  const valor       = transaction.amount ? Number(transaction.amount) : null
  const clientName  = (transaction.customer_name ?? '') as string
  const fmtValor    = valor
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
    : ''

  // ── Determina severidade ──
  let severity: 'high' | 'medium' | 'low' = 'low'
  if (DOM_HIGH_SEVERITY_EVENTS.includes(event as typeof DOM_HIGH_SEVERITY_EVENTS[number]))   severity = 'high'
  else if (DOM_MEDIUM_SEVERITY_EVENTS.includes(event as typeof DOM_MEDIUM_SEVERITY_EVENTS[number])) severity = 'medium'

  const eventLabel = DOM_EVENT_LABELS[event] ?? event

  // ── Mensagens ──
  const messages: Partial<Record<string, string>> = {
    'CHARGE-APPROVED':           `Dom Pagamentos: pagamento de ${fmtValor} aprovado${clientName ? ` — ${clientName}` : ''}`,
    'CHARGE-CHARGEBACK':         `Dom Pagamentos: chargeback de ${fmtValor}${clientName ? ` — ${clientName}` : ''}. Ação imediata necessária.`,
    'CHARGE-REFUND':             `Dom Pagamentos: estorno de ${fmtValor}${clientName ? ` — ${clientName}` : ''}`,
    'CHARGE-DISPUT':             `Dom Pagamentos: transação de ${fmtValor} em disputa${clientName ? ` — ${clientName}` : ''}`,
    'CHARGE-EXPIRE':             `Dom Pagamentos: cobrança de ${fmtValor} expirada${clientName ? ` — ${clientName}` : ''}`,
    'CHARGE-NOT_AUTHORIZED':     `Dom Pagamentos: pagamento de ${fmtValor} não autorizado${clientName ? ` — ${clientName}` : ''}`,
    'CHARGE-REJECTED_ANTIFRAUD': `Dom Pagamentos: transação rejeitada pelo antifraude${clientName ? ` — ${clientName}` : ''}`,
    'CHARGE-DISPUTE_PENDING':    `Dom Pagamentos: disputa em análise pela bandeira${clientName ? ` — ${clientName}` : ''}`,
    'SIGNATURE-INVOICE-PAID':    `Dom Pagamentos: fatura de assinatura paga${fmtValor ? ` — ${fmtValor}` : ''}${clientName ? ` — ${clientName}` : ''}`,
    'SIGNATURE-INVOICE-FAILED':  `Dom Pagamentos: falha no pagamento de fatura${fmtValor ? ` — ${fmtValor}` : ''}${clientName ? ` — ${clientName}` : ''}`,
    'SIGNATURE-CANCELLED':       `Dom Pagamentos: assinatura cancelada${clientName ? ` — ${clientName}` : ''}`,
  }
  const message = messages[event] ?? `Dom Pagamentos: ${eventLabel}${clientName ? ` — ${clientName}` : ''}`

  // ── Eventos sem alerta ──
  const SKIP_ALERT = new Set([
    'CHARGE-PIX-QRCODE', 'SIGNATURE-CREATED', 'SIGNATURE-MODE-AUTO',
    'SIGNATURE-MODE-MANUAL', 'SIGNATURE-INVOICE-CREATED',
    'SUBACCOUNT-NEW-TOKEN', 'SUBACCOUNT-CREATED', 'CHARGE-DISPUTE_WON',
  ])

  if (!SKIP_ALERT.has(event)) {
    // Tenta encontrar o client_id pelo document (CPF/CNPJ)
    let clientId: string | null = null
    const doc = (transaction.customer_document as string | undefined)?.replace(/\D/g, '')
    if (doc) {
      const { data: match } = await supabase
        .from('clients')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('cnpj', doc)
        .maybeSingle()
      clientId = match?.id ?? null
    }

    await supabase.from('alerts').insert({
      agency_id: agencyId,
      client_id: clientId,
      type:      mapEventToAlertType(event),
      severity,
      message,
      is_read:   false,
      metadata:  {
        event,
        transaction_id: transaction.id ?? null,
        source:         'dom_pagamentos',
        amount:         valor,
      },
    })

    // Atualiza payment_status do cliente
    if ((event === 'CHARGE-APPROVED' || event === 'SIGNATURE-INVOICE-PAID') && clientId) {
      await supabase.from('clients')
        .update({ payment_status: 'em_dia', updated_at: new Date().toISOString() })
        .eq('id', clientId)
    }
    if (['CHARGE-CHARGEBACK', 'SIGNATURE-INVOICE-FAILED', 'CHARGE-DISPUT'].includes(event) && clientId) {
      await supabase.from('clients')
        .update({ payment_status: 'inadimplente', updated_at: new Date().toISOString() })
        .eq('id', clientId)
    }
  }

  return NextResponse.json({ received: true, event, agency_id: agencyId })
}

function mapEventToAlertType(event: string): string {
  if (event.includes('CHARGEBACK') || event.includes('DISPUT')) return 'chargeback'
  if (event.includes('ANTIFRAUD'))                              return 'integration_error'
  if (event.includes('REFUND'))                                 return 'score_drop'
  if (event.includes('CANCELLED') || event.includes('FAILED'))  return 'score_drop'
  if (event.includes('EXPIRE') || event.includes('NOT_AUTHORIZED')) return 'score_drop'
  return 'integration_error'
}
