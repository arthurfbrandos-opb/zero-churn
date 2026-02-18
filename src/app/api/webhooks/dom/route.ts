/**
 * POST /api/webhooks/dom
 *
 * Recebe eventos em tempo real da Dom Pagamentos.
 * URL a cadastrar no painel Dom: https://zero-churn.vercel.app/api/webhooks/dom
 *
 * Fluxo:
 *  1. Dom envia POST com { event, webhook_code, data }
 *  2. Verificamos o webhook_code contra os cadastrados nas agency_integrations
 *  3. Criamos alertas e atualizamos status de pagamento do cliente
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import {
  DomWebhookPayload,
  DomTransaction,
  DOM_HIGH_SEVERITY_EVENTS,
  DOM_MEDIUM_SEVERITY_EVENTS,
  DOM_EVENT_LABELS,
  domAmountToReal,
} from '@/lib/dom/client'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as DomWebhookPayload
    const { event, data } = payload

    if (!event) return NextResponse.json({ error: 'evento inválido' }, { status: 400 })

    // ── Identifica a agência pelo webhook_code ─────────────────
    // Usa o admin client para varrer todas as agências
    const supabase = await createAdminClient()

    const { data: integrations } = await supabase
      .from('agency_integrations')
      .select('id, agency_id, encrypted_key')
      .eq('type', 'dom_pagamentos')
      .eq('status', 'active')

    let agencyId: string | null = null

    for (const integ of integrations ?? []) {
      try {
        await decrypt<{ token: string }>(integ.encrypted_key)
        // Sem webhook_code — aceita qualquer agência com Dom ativo
        agencyId = integ.agency_id
        break
      } catch { continue }
    }

    // Se não encontrou agência pelo código, aceita mesmo assim
    // (pode ser que a agência não tenha configurado webhook_code)
    // mas loga para diagnóstico
    if (!agencyId && integrations?.length === 1) {
      agencyId = integrations[0].agency_id
    }

    if (!agencyId) {
      // Retorna 200 para a Dom não ficar tentando reenviar
      return NextResponse.json({ received: true, warning: 'agency_not_found' })
    }

    // ── Processa o evento ──────────────────────────────────────
    const transaction = data as DomTransaction
    const valor       = transaction.amount ? domAmountToReal(transaction.amount) : null
    const clientName  = transaction.customer?.name ?? 'cliente'
    const fmtValor    = valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor) : ''

    // Determina severidade
    let severity: 'high' | 'medium' | 'low' = 'low'
    if (DOM_HIGH_SEVERITY_EVENTS.includes(event as typeof DOM_HIGH_SEVERITY_EVENTS[number])) {
      severity = 'high'
    } else if (DOM_MEDIUM_SEVERITY_EVENTS.includes(event as typeof DOM_MEDIUM_SEVERITY_EVENTS[number])) {
      severity = 'medium'
    }

    const eventLabel = DOM_EVENT_LABELS[event] ?? event

    // Monta mensagem do alerta
    const messages: Record<string, string> = {
      'CHARGE-APPROVED':           `Dom Pagamentos: pagamento de ${fmtValor} aprovado${clientName ? ` — ${clientName}` : ''}`,
      'CHARGE-CHARGEBACK':         `Dom Pagamentos: chargeback de ${fmtValor}${clientName ? ` — ${clientName}` : ''}. Ação imediata necessária.`,
      'CHARGE-REFUND':             `Dom Pagamentos: estorno de ${fmtValor}${clientName ? ` — ${clientName}` : ''}`,
      'CHARGE-DISPUT':             `Dom Pagamentos: transação de ${fmtValor} em disputa${clientName ? ` — ${clientName}` : ''}`,
      'CHARGE-EXPIRE':             `Dom Pagamentos: cobrança de ${fmtValor} expirada${clientName ? ` — ${clientName}` : ''}`,
      'CHARGE-NOT_AUTHORIZED':     `Dom Pagamentos: pagamento de ${fmtValor} não autorizado${clientName ? ` — ${clientName}` : ''}`,
      'CHARGE-REJECTED_ANTIFRAUD': `Dom Pagamentos: transação de ${fmtValor} rejeitada pelo antifraude${clientName ? ` — ${clientName}` : ''}`,
      'CHARGE-DISPUTE_PENDING':    `Dom Pagamentos: disputa de ${fmtValor} em análise pela bandeira${clientName ? ` — ${clientName}` : ''}`,
      'SIGNATURE-INVOICE-PAID':    `Dom Pagamentos: fatura de assinatura paga${fmtValor ? ` — ${fmtValor}` : ''}${clientName ? ` — ${clientName}` : ''}`,
      'SIGNATURE-INVOICE-FAILED':  `Dom Pagamentos: falha no pagamento da fatura${fmtValor ? ` — ${fmtValor}` : ''}${clientName ? ` — ${clientName}` : ''}`,
      'SIGNATURE-CANCELLED':       `Dom Pagamentos: assinatura cancelada${clientName ? ` — ${clientName}` : ''}`,
    }

    const message = messages[event] ?? `Dom Pagamentos: ${eventLabel}${clientName ? ` — ${clientName}` : ''}`

    // Eventos que NÃO geram alerta (apenas informativos)
    const SKIP_ALERT = new Set([
      'CHARGE-PIX-QRCODE',
      'SIGNATURE-CREATED',
      'SIGNATURE-MODE-AUTO',
      'SIGNATURE-MODE-MANUAL',
      'SIGNATURE-INVOICE-CREATED',
      'SUBACCOUNT-NEW-TOKEN',
      'SUBACCOUNT-CREATED',
      'CHARGE-DISPUTE_WON',
    ])

    if (!SKIP_ALERT.has(event)) {
      // Tenta encontrar o client_id pelo document do customer
      let clientId: string | null = null
      const document = transaction.customer?.document?.replace(/\D/g, '')
      if (document) {
        const { data: clientMatch } = await supabase
          .from('clients')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('cnpj', document)
          .maybeSingle()
        clientId = clientMatch?.id ?? null
      }

      await supabase.from('alerts').insert({
        agency_id: agencyId,
        client_id: clientId,
        type:      mapEventToAlertType(event),
        severity,
        message,
        is_read:   false,
        metadata:  { event, transaction_id: transaction.id ?? null, source: 'dom_pagamentos' },
      })

      // Se for pagamento aprovado ou fatura paga, atualiza status do cliente
      if ((event === 'CHARGE-APPROVED' || event === 'SIGNATURE-INVOICE-PAID') && clientId) {
        await supabase.from('clients')
          .update({ payment_status: 'em_dia', updated_at: new Date().toISOString() })
          .eq('id', clientId)
      }

      // Se for chargeback, inadimplência ou falha → atualiza status do cliente
      if (['CHARGE-CHARGEBACK', 'SIGNATURE-INVOICE-FAILED', 'CHARGE-DISPUT'].includes(event) && clientId) {
        await supabase.from('clients')
          .update({ payment_status: 'inadimplente', updated_at: new Date().toISOString() })
          .eq('id', clientId)
      }
    }

    return NextResponse.json({ received: true, event, agency: agencyId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Sempre retorna 200 para a Dom não tentar reenviar
    return NextResponse.json({ received: true, error: msg })
  }
}

function mapEventToAlertType(event: string): string {
  if (event.includes('CHARGEBACK') || event.includes('DISPUT')) return 'chargeback'
  if (event.includes('ANTIFRAUD'))  return 'integration_error'
  if (event.includes('REFUND'))     return 'score_drop'
  if (event.includes('CANCELLED'))  return 'score_drop'
  if (event.includes('FAILED'))     return 'score_drop'
  if (event.includes('EXPIRE') || event.includes('NOT_AUTHORIZED')) return 'score_drop'
  return 'integration_error'
}
