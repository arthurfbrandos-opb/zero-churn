/**
 * Dom Pagamentos API Client v2 — campos corrigidos com base na estrutura real da API
 *
 * URL produção: https://apiv3.dompagamentos.com.br/checkout/production
 * URL sandbox:  https://hml-apiv3.dompagamentos.com.br/checkout/sandbox
 * Auth:         Authorization: Bearer {token}
 *
 * Estrutura real da transação (descoberta via /api/dom/debug):
 *   status: "paid" | "pending" | "refused" | "refunded" | "chargeback" (LOWERCASE)
 *   amount: centavos (720000 = R$7.200,00)
 *   liquid_amount: valor líquido após taxas
 *   payment_method: "credit_card" | "boleto" | "pix" | "debit_card" (lowercase)
 *   customer.document_type: "CPF" | "CNPJ"
 *   installments: string ("12" = 12x no cartão)
 *   liquidation[0].date: data de liquidação
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

// ── Tipos reais (mapeados da API) ──────────────────────────────

/** Status reais retornados pela Dom Pagamentos API */
export type DomTransactionStatus =
  | 'paid'           // aprovado e pago
  | 'pending'        // aguardando pagamento
  | 'refused'        // recusado (antifraude ou banco)
  | 'refunded'       // estornado
  | 'chargeback'     // chargeback
  | 'expired'        // expirado
  | 'authorized'     // pré-autorizado (cartão)
  | 'cancelled'      // cancelado

export type DomPaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'boleto'
  | 'pix'

export interface DomLiquidation {
  type:        string        // "CREDIT"
  date:        string        // "YYYY-MM-DD" — data de liquidação
  competence:  string        // "YYYY-MM-DD"
  total_gross: number        // centavos
  total_liquid: number       // centavos
  installment: number        // número desta parcela
  installments: number       // total de parcelas
}

export interface DomItem {
  id:          string
  description: string
  price:       number        // centavos
  quantity:    number
}

export interface DomTransaction {
  id:              string
  created_at:      string   // "YYYY-MM-DD HH:MM:SS"
  updated_at:      string
  cod_external:    string | null
  amount:          number   // centavos (dividir por 100 para reais)
  liquid_amount:   number   // centavos após taxas
  liquidation:     DomLiquidation[]
  currency:        string   // "BRL"
  status:          DomTransactionStatus
  status_details:  string   // "Aprovado", "Recusado", etc.
  payment_method:  DomPaymentMethod
  installments:    string   // "12" = 12x no cartão (string!)
  card_brand?:     string   // "MASTERCARD", "VISA", etc.
  card_bin?:       string   // "555507******9510"
  boleto_url?:     string | null
  pix_qrcode?:     string | null
  pix_qrcode_url?: string
  product_first?:  string   // primeiro produto
  items:           DomItem[]
  customer: {
    name:          string
    email:         string
    mobile_phone?: string
    document:      string   // CPF ou CNPJ (somente dígitos)
    document_type: 'CPF' | 'CNPJ'
    birthdate?:    string | null
  }
  relations: {
    id_invoice?:       string
    id_link_payment?:  string
    id_subscriber?:    string
  }
  fee_details?: {
    amount:    number
    fee_payer: string
    type:      string
  }
}

export interface DomListResponse<T> {
  data:       T[]
  total?:     number
  page?:      number
  per_page?:  number
  last_page?: number
}

// ── Helpers ────────────────────────────────────────────────────

/** Centavos → Reais */
export function domAmountToReal(cents: number): number {
  return cents / 100
}

/** Data de pagamento: pega de liquidation[0].date ou created_at */
export function domGetPaidAt(tx: DomTransaction): string | null {
  return tx.liquidation?.[0]?.date ?? null
}

/** Data no formato "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DD" */
export function domDateToISO(dt: string): string {
  return dt.slice(0, 10)
}

/** Status Dom → status interno Zero Churn */
export function domStatusToInternal(status: DomTransactionStatus): 'RECEIVED' | 'PENDING' | 'OVERDUE' | 'REFUNDED' {
  const map: Record<DomTransactionStatus, 'RECEIVED' | 'PENDING' | 'OVERDUE' | 'REFUNDED'> = {
    paid:       'RECEIVED',
    pending:    'PENDING',
    authorized: 'PENDING',
    refused:    'REFUNDED',
    refunded:   'REFUNDED',
    chargeback: 'REFUNDED',
    expired:    'REFUNDED',
    cancelled:  'REFUNDED',
  }
  return map[status] ?? 'PENDING'
}

/** Testa se o token é válido */
export async function testCredentials(credentials: DomCredentials): Promise<boolean> {
  try {
    await listTransactions(credentials, { per_page: 1 })
    return true
  } catch {
    return false
  }
}

// ── Endpoints ──────────────────────────────────────────────────

export async function listTransactions(
  credentials: DomCredentials,
  params: {
    start_date?: string     // YYYY-MM-DD
    end_date?:   string
    status?:     DomTransactionStatus | DomTransactionStatus[]
    page?:       number
    per_page?:   number
  } = {}
): Promise<DomListResponse<DomTransaction>> {
  const qs = new URLSearchParams()
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date)   qs.set('end_date',   params.end_date)
  if (params.page)       qs.set('page',        String(params.page))
  qs.set('per_page', String(params.per_page ?? 100))

  const statuses = Array.isArray(params.status)
    ? params.status
    : params.status ? [params.status] : []
  statuses.forEach(s => qs.append('status[]', s))

  return domRequest<DomListResponse<DomTransaction>>(
    `/transactions?${qs.toString()}`,
    credentials
  )
}

/** Busca APENAS transações pagas (status: "paid") com paginação automática */
export async function fetchPaidTransactions(
  credentials: DomCredentials,
  startDate:   string,
  endDate:     string,
): Promise<DomTransaction[]> {
  const all: DomTransaction[] = []
  let page = 1
  let hasMore = true

  while (hasMore && page <= 20) {
    const res = await listTransactions(credentials, {
      start_date: startDate,
      end_date:   endDate,
      status:     'paid',   // ← SOMENTE APROVADAS
      page,
      per_page:   100,
    })

    // Filtra client-side também (garante que só "paid" entra)
    const paid = (res.data ?? []).filter(tx => tx.status === 'paid')
    all.push(...paid)

    const lastPage = res.last_page ?? 1
    hasMore = page < lastPage
    page++
  }

  return all
}

/** Busca uma transação específica */
export async function getTransaction(
  credentials: DomCredentials,
  id: string
): Promise<DomTransaction> {
  return domRequest<DomTransaction>(`/transactions/${id}`, credentials)
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
  data:       DomTransaction | Record<string, unknown>
  created_at?: string
}

export const DOM_HIGH_SEVERITY_EVENTS: DomWebhookEvent[] = [
  'CHARGE-CHARGEBACK',
  'CHARGE-DISPUT',
  'CHARGE-REJECTED_ANTIFRAUD',
  'SIGNATURE-CANCELLED',
  'SIGNATURE-INVOICE-FAILED',
]

export const DOM_MEDIUM_SEVERITY_EVENTS: DomWebhookEvent[] = [
  'CHARGE-REFUND',
  'CHARGE-NOT_AUTHORIZED',
  'CHARGE-EXPIRE',
  'CHARGE-DISPUTE_PENDING',
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
