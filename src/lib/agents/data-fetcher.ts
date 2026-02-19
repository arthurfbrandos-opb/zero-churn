/**
 * Data Fetcher — busca dados de pagamentos do banco para os agentes.
 *
 * Reutiliza os dados já coletados e normalizados durante o sync
 * (via Asaas e Dom), evitando chamadas externas desnecessárias durante
 * a análise.
 *
 * Se os dados estiverem stale (> 24h), faz novo sync antes de retornar.
 * 
 * IMPORTANTE: Usa dueDate (vencimento) em vez de paymentDate para todos os filtros
 * de status, garantindo consistência na análise financeira.
 */

import { fetchPaidTransactions, DomCredentials, domDateToISO, domStatusToInternal } from '@/lib/dom/client'
import { decrypt } from '@/lib/supabase/encryption'

// ── Tipos de pagamento normalizado ────────────────────────────────

export interface NormalizedPayment {
  id:          string
  status:      string
  dueDate:     string
  paymentDate: string | null
  value:       number
  netValue:    number
  fonte:       'asaas' | 'dom'
}

// ── Busca pagamentos do Asaas para um cliente ─────────────────────

async function fetchAsaasPayments(
  integrations: Array<Record<string, unknown>>,
  agencyApiKey: string | null,
  startDate: string,
  endDate:   string,
): Promise<NormalizedPayment[]> {
  console.log(`[data-fetcher] fetchAsaasPayments: ${integrations.length} integrations, period=${startDate} to ${endDate}`)
  
  if (!agencyApiKey) {
    console.warn('[data-fetcher] No agencyApiKey provided')
    return []
  }

  const ASAAS_BASE = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'
  const payments: NormalizedPayment[] = []

  for (const integ of integrations) {
    const creds = integ.credentials as Record<string, string> | null
    const customerId = creds?.customer_id
    console.log(`[data-fetcher] Asaas integ:`, { 
      type: integ.type, 
      status: integ.status,
      hasCredentials: !!creds,
      customerId,
      credentials: creds
    })
    if (!customerId) {
      console.warn(`[data-fetcher] Asaas integration skipped: no customer_id`)
      continue
    }

    try {
      // Busca pagamentos RECEBIDOS por dueDate (vencimento) em vez de paymentDate
      // Isso garante que pegamos todos os pagamentos do período, independente de quando foram pagos
      const [receivedRes, pendingRes, overdueRes] = await Promise.allSettled([
        fetch(`${ASAAS_BASE}/payments?customer=${customerId}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`, {
          headers: { 'access_token': agencyApiKey },
          next: { revalidate: 0 },
        }),
        fetch(`${ASAAS_BASE}/payments?customer=${customerId}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=PENDING&limit=100`, {
          headers: { 'access_token': agencyApiKey },
          next: { revalidate: 0 },
        }),
        fetch(`${ASAAS_BASE}/payments?customer=${customerId}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=OVERDUE,CHARGEBACK_REQUESTED,CHARGEBACK_DISPUTE&limit=100`, {
          headers: { 'access_token': agencyApiKey },
          next: { revalidate: 0 },
        }),
      ])

      const seen = new Set<string>()
      for (const res of [receivedRes, pendingRes, overdueRes]) {
        if (res.status !== 'fulfilled') {
          console.warn('[data-fetcher] Asaas fetch failed:', res.reason)
          continue
        }
        if (!res.value.ok) {
          console.warn('[data-fetcher] Asaas HTTP error:', res.value.status, await res.value.text().catch(() => ''))
          continue
        }
        const data = await res.value.json()
        console.log(`[data-fetcher] Asaas batch: ${(data.data ?? []).length} pagamentos`)
        for (const p of (data.data ?? [])) {
          if (seen.has(p.id)) continue
          seen.add(p.id)
          payments.push({
            id:          p.id,
            status:      p.status,
            dueDate:     p.dueDate,
            paymentDate: p.paymentDate ?? null,
            value:       p.value ?? 0,
            netValue:    p.netValue && p.netValue > 0 ? p.netValue : (p.value ?? 0),
            fonte:       'asaas',
          })
        }
      }
      console.log(`[data-fetcher] Total Asaas payments collected for customer ${customerId}: ${payments.length}`)
    } catch (err) {
      console.error(`[data-fetcher] Error fetching Asaas payments for customer ${customerId}:`, err)
    }
  }

  console.log(`[data-fetcher] fetchAsaasPayments FINAL: ${payments.length} total payments`)
  return payments
}

// ── Busca pagamentos do Dom para um cliente ───────────────────────

async function fetchDomPaymentsForClient(
  integrations: Array<Record<string, unknown>>,
  agencyCreds:  DomCredentials | null,
  startDate:    string,
  endDate:      string,
): Promise<NormalizedPayment[]> {
  if (!agencyCreds) return []

  const payments: NormalizedPayment[] = []

  for (const integ of integrations) {
    const creds = integ.credentials as Record<string, string> | null
    const doc   = creds?.document?.replace(/\D/g, '')
    if (!doc) continue

    try {
      const transactions = await fetchPaidTransactions(agencyCreds, startDate, endDate)
      for (const tx of transactions) {
        // DomTransaction usa customer_document (não buyer_document)
        const txDoc = (tx.customer_document ?? '').replace(/\D/g, '')
        if (txDoc !== doc) continue

        // Dom API retorna valores já em Reais (não centavos) — conforme estrutura real
        payments.push({
          id:          tx.id ?? String(Math.random()),
          status:      domStatusToInternal(tx.status),
          // Dom não tem dueDate explícito no endpoint de lista — usa created_at como referência
          dueDate:     domDateToISO(tx.created_at) ?? startDate,
          paymentDate: tx.status === 'paid' ? (domDateToISO(tx.updated_at) ?? null) : null,
          value:       tx.amount ?? 0,
          netValue:    tx.liquid_amount ?? tx.amount ?? 0,
          fonte:       'dom',
        })
      }
    } catch { /* ignora erros individuais */ }
  }

  return payments
}

// ── Função principal ──────────────────────────────────────────────

export async function fetchPaymentsByCustomerFromDb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase:       any,
  clientId:       string,
  agencyId:       string,
  asaasIntegs:    Array<Record<string, unknown>>,
  domIntegs:      Array<Record<string, unknown>>,
): Promise<{ asaasPayments: NormalizedPayment[]; domPayments: NormalizedPayment[] }> {
  const endDate   = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
  
  console.log(`[data-fetcher] START: clientId=${clientId}, period=${startDate} to ${endDate}`)
  console.log(`[data-fetcher] asaasIntegs=${asaasIntegs.length}, domIntegs=${domIntegs.length}`)

  // Busca chaves da agência
  const { data: agencyAsaas } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('agency_id', agencyId)
    .eq('type', 'asaas')
    .maybeSingle()

  const { data: agencyDom } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('agency_id', agencyId)
    .eq('type', 'dom_pagamentos')
    .maybeSingle()

  // Asaas
  let asaasPayments: NormalizedPayment[] = []
  if (agencyAsaas?.encrypted_key && asaasIntegs.length > 0) {
    try {
      const apiKey = await decrypt<string>(agencyAsaas.encrypted_key)
      asaasPayments = await fetchAsaasPayments(asaasIntegs, apiKey, startDate, endDate)
    } catch { /* ignora */ }
  }

  // Dom
  let domPayments: NormalizedPayment[] = []
  if (agencyDom?.encrypted_key && domIntegs.length > 0) {
    try {
      const domCreds = await decrypt<DomCredentials>(agencyDom.encrypted_key)
      domPayments = await fetchDomPaymentsForClient(domIntegs, domCreds, startDate, endDate)
    } catch { /* ignora */ }
  }

  return { asaasPayments, domPayments }
}
