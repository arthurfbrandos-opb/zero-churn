/**
 * Dom Pagamentos API Client — v3 (mapeamento corrigido com dados reais)
 *
 * IMPORTANTE: O endpoint GET /transactions (lista) retorna estrutura DIFERENTE
 * do endpoint GET /transactions/{id} (individual):
 *
 * Lista  → campos PLANOS: customer_name, customer_document, customer_email, customer_phone
 *        → amount e liquid_amount já em REAIS (ex: 1500 = R$1.500, 1442.66 = R$1.442,66)
 *        → installments: number (não string)
 *        → SEM liquidation array, SEM fee_details, SEM items
 *
 * Individual → campos ANINHADOS: customer.name, customer.document, etc.
 *            → amount e liquid_amount em CENTAVOS (ex: 720000 = R$7.200)
 *            → COM liquidation, fee_details, items
 */

const BASE_PROD    = 'https://apiv3.dompagamentos.com.br/checkout/production'
const BASE_SANDBOX = 'https://hml-apiv3.dompagamentos.com.br/checkout/sandbox'

export interface DomCredentials {
  token:        string
  public_key?:  string
  environment?: 'production' | 'sandbox'
}

function getBaseUrl(env?: string) {
  return env === 'sandbox' ? BASE_SANDBOX : BASE_PROD
}

async function domRequest<T>(
  path: string,
  credentials: DomCredentials,
  options?: RequestInit
): Promise<T> {
  const base = getBaseUrl(credentials.environment)
  const res  = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${credentials.token}`,
      'Content-Type':  'application/json',
      ...(options?.headers ?? {}),
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      `Dom Pagamentos API ${res.status}: ${body?.message ?? body?.error ?? res.statusText}`
    )
  }

  return res.json()
}

// ── Status reais da API ────────────────────────────────────────

export type DomTransactionStatus =
  | 'paid'
  | 'pending'
  | 'not_authorized'
  | 'refused'
  | 'refunded'
  | 'chargeback'
  | 'expired'
  | 'authorized'
  | 'cancelled'
  | 'dispute'

export type DomPaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'boleto'
  | 'pix'

// ── Interface da LISTA (/transactions) — campos PLANOS ─────────
// amount e liquid_amount já são REAIS (não centavos)
export interface DomTransaction {
  id:               string
  type_operation:   string           // "online"
  created_at:       string           // "YYYY-MM-DD HH:MM:SS"
  updated_at:       string
  cod_external:     string | null
  amount:           number           // REAIS (ex: 1500 = R$1.500,00)
  liquid_amount:    number           // REAIS (ex: 1442.66 = R$1.442,66)
  status:           DomTransactionStatus
  status_details:   string           // "Aprovado", "Não Autorizado", etc.
  payment_method:   DomPaymentMethod
  installments:     number           // número de parcelas
  card_bin?:        string
  card_brand?:      string
  card_code_auth?:  string
  boleto_url?:      string | null
  boleto_digitable_line?: string | null
  pix_qrcode?:      string | null
  pix_content?:     string | null
  pix_expire?:      string
  // Dados do cliente — PLANOS (não aninhados!)
  customer_name:    string
  customer_document: string          // CPF ou CNPJ (somente dígitos)
  customer_birthdate?: string | null
  customer_email:   string
  customer_phone?:  string
  product_first?:   string           // descrição do produto
  postbackUrl?:     string | null
}

export interface DomListResponse<T> {
  data?:      T[]       // pode vir direto no root ou em .data
  total?:     number
  page?:      number
  per_page?:  number
  last_page?: number
}

// ── Helpers ────────────────────────────────────────────────────

/** Status Dom → status interno Zero Churn */
export function domStatusToInternal(
  status: DomTransactionStatus
): 'RECEIVED' | 'PENDING' | 'OVERDUE' | 'REFUNDED' {
  const map: Record<DomTransactionStatus, 'RECEIVED' | 'PENDING' | 'OVERDUE' | 'REFUNDED'> = {
    paid:           'RECEIVED',
    pending:        'PENDING',
    authorized:     'PENDING',
    not_authorized: 'REFUNDED',
    refused:        'REFUNDED',
    refunded:       'REFUNDED',
    chargeback:     'REFUNDED',
    expired:        'REFUNDED',
    cancelled:      'REFUNDED',
    dispute:        'REFUNDED',
  }
  return map[status] ?? 'PENDING'
}

/** Data no formato "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DD" */
export function domDateToISO(dt: string): string {
  return dt ? dt.slice(0, 10) : ''
}

// ── Endpoints ──────────────────────────────────────────────────

/**
 * Lista transações (sem filtros na URL — Dom retorna 500 com filtros).
 * A resposta pode vir como array direto ou como { data: [], total: N }.
 */
export async function listTransactions(
  credentials: DomCredentials,
  params: { page?: number; per_page?: number } = {}
): Promise<{ data: DomTransaction[]; total?: number; last_page?: number }> {
  const qs = new URLSearchParams()
  if (params.page && params.page > 1) qs.set('page', String(params.page))
  qs.set('per_page', String(params.per_page ?? 100))

  const query = qs.toString()
  const raw = await domRequest<DomListResponse<DomTransaction> | DomTransaction[]>(
    `/transactions${query ? `?${query}` : ''}`,
    credentials
  )

  // Normaliza: a API pode retornar array direto ou { data: [...], total: N }
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length }
  }
  return {
    data:      raw.data ?? [],
    total:     raw.total,
    last_page: raw.last_page,
  }
}

/**
 * Busca APENAS transações pagas dentro de um período.
 * - Filtra status === 'paid' client-side
 * - amounts já vêm em REAIS — sem divisão por 100
 * - Para quando a data mais antiga da página já passou do início do período
 */
export async function fetchPaidTransactions(
  credentials: DomCredentials,
  startDate:   string,   // YYYY-MM-DD
  endDate:     string,
): Promise<DomTransaction[]> {
  const all:   DomTransaction[] = []
  const start = new Date(startDate).getTime()
  const end   = new Date(endDate + 'T23:59:59').getTime()

  let page       = 1
  let hasMore    = true
  let emptyPages = 0

  while (hasMore && page <= 30 && emptyPages < 3) {
    const res  = await listTransactions(credentials, { page, per_page: 100 })
    const rows = res.data ?? []

    if (rows.length === 0) break

    const paid = rows.filter(tx => {
      if (tx.status !== 'paid') return false
      const txDate = new Date(tx.created_at.replace(' ', 'T')).getTime()
      return txDate >= start && txDate <= end
    })

    all.push(...paid)

    // Se a mais antiga já está antes do início → não precisa continuar
    const oldest = rows[rows.length - 1]
    if (oldest) {
      const oldestDate = new Date(oldest.created_at.replace(' ', 'T')).getTime()
      if (oldestDate < start) break
    }

    if (paid.length === 0) emptyPages++
    else emptyPages = 0

    const lastPage = res.last_page ?? 1
    hasMore = page < lastPage
    page++
  }

  return all
}

/**
 * Busca uma transação específica (GET /transactions/{id}).
 * ATENÇÃO: este endpoint retorna estrutura DIFERENTE da lista
 * (campos aninhados, amounts em CENTAVOS).
 */
export async function getTransaction(
  credentials: DomCredentials,
  id: string
): Promise<Record<string, unknown>> {
  return domRequest<Record<string, unknown>>(`/transactions/${id}`, credentials)
}

// ── Webhook ────────────────────────────────────────────────────

export type DomWebhookEvent =
  | 'CHARGE-APPROVED'
  | 'CHARGE-REFUND'
  | 'CHARGE-DISPUT'
  | 'CHARGE-CHARGEBACK'
  | 'CHARGE-EXPIRE'
  | 'CHARGE-PIX-QRCODE'
  | 'CHARGE-NOT_AUTHORIZED'
  | 'CHARGE-REVISION_PAID'
  | 'CHARGE-REJECTED_ANTIFRAUD'
  | 'CHARGE-DISPUTE_PENDING'
  | 'CHARGE-DISPUTE_WON'
  | 'SIGNATURE-CREATED'
  | 'SIGNATURE-CHANGED'
  | 'SIGNATURE-CANCELLED'
  | 'SIGNATURE-MODE-AUTO'
  | 'SIGNATURE-MODE-MANUAL'
  | 'SIGNATURE-INVOICE-CREATED'
  | 'SIGNATURE-INVOICE-PAID'
  | 'SIGNATURE-INVOICE-FAILED'
  | 'SUBACCOUNT-CANCELLED'
  | 'SUBACCOUNT-NEW-TOKEN'
  | 'SUBACCOUNT-CREATED'

export interface DomWebhookPayload {
  event:      DomWebhookEvent
  data:       Record<string, unknown>
  created_at?: string
}

export const DOM_HIGH_SEVERITY_EVENTS: DomWebhookEvent[] = [
  'CHARGE-CHARGEBACK', 'CHARGE-DISPUT', 'CHARGE-REJECTED_ANTIFRAUD',
  'SIGNATURE-CANCELLED', 'SIGNATURE-INVOICE-FAILED',
]

export const DOM_MEDIUM_SEVERITY_EVENTS: DomWebhookEvent[] = [
  'CHARGE-REFUND', 'CHARGE-NOT_AUTHORIZED', 'CHARGE-EXPIRE', 'CHARGE-DISPUTE_PENDING',
]

export const DOM_EVENT_LABELS: Record<DomWebhookEvent, string> = {
  'CHARGE-APPROVED':           'Pagamento aprovado',
  'CHARGE-REFUND':             'Estorno realizado',
  'CHARGE-DISPUT':             'Transação em disputa',
  'CHARGE-CHARGEBACK':         'Chargeback',
  'CHARGE-EXPIRE':             'Transação expirada',
  'CHARGE-PIX-QRCODE':        'QR Code Pix gerado',
  'CHARGE-NOT_AUTHORIZED':     'Pagamento não autorizado',
  'CHARGE-REVISION_PAID':      'Pagamento em revisão antifraude',
  'CHARGE-REJECTED_ANTIFRAUD': 'Rejeitado pelo antifraude',
  'CHARGE-DISPUTE_PENDING':    'Disputa em análise pela bandeira',
  'CHARGE-DISPUTE_WON':        'Disputa ganha',
  'SIGNATURE-CREATED':         'Assinatura criada',
  'SIGNATURE-CHANGED':         'Assinatura alterada',
  'SIGNATURE-CANCELLED':       'Assinatura cancelada',
  'SIGNATURE-MODE-AUTO':       'Faturamento automático ativado',
  'SIGNATURE-MODE-MANUAL':     'Faturamento manual ativado',
  'SIGNATURE-INVOICE-CREATED': 'Fatura de assinatura criada',
  'SIGNATURE-INVOICE-PAID':    'Fatura de assinatura paga',
  'SIGNATURE-INVOICE-FAILED':  'Falha no pagamento da fatura',
  'SUBACCOUNT-CANCELLED':      'Subconta cancelada',
  'SUBACCOUNT-NEW-TOKEN':      'Novo token de subconta',
  'SUBACCOUNT-CREATED':        'Subconta criada',
}
