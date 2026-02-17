/**
 * Dom Pagamentos API Client
 * Documentação: https://dom-pagamentos.readme.io/reference/introducao
 *
 * Autenticação: Authorization: Bearer {token}
 * URL produção: https://apiv3.dompagamentos.com.br/checkout/production
 * URL sandbox:  https://hml-apiv3.dompagamentos.com.br/checkout/sandbox
 *
 * Credenciais salvas criptografadas em agency_integrations:
 *   { token, public_key, webhook_code, environment }
 */

const BASE_PROD    = 'https://apiv3.dompagamentos.com.br/checkout/production'
const BASE_SANDBOX = 'https://hml-apiv3.dompagamentos.com.br/checkout/sandbox'

export interface DomCredentials {
  token:        string
  public_key?:  string
  webhook_code?: string
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

// ── Tipos ──────────────────────────────────────────────────────

export type DomTransactionStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'OVERDUE'
  | 'REFUND'
  | 'CHARGEBACK'
  | 'EXPIRE'
  | 'NOT_AUTHORIZED'
  | 'REJECTED_ANTIFRAUD'
  | 'DISPUTE'
  | 'REVISION_PAID'
  | 'CANCELLED'

export type DomPaymentMethod = 'CREDIT_CARD' | 'BOLETO' | 'PIX' | 'DEBIT_CARD'

export interface DomTransaction {
  id:             string
  status:         DomTransactionStatus
  amount:         number          // em centavos
  net_amount?:    number
  payment_method: DomPaymentMethod
  description?:   string
  created_at:     string          // ISO
  updated_at?:    string
  paid_at?:       string
  due_date?:      string
  customer?: {
    id?:    string
    name?:  string
    email?: string
    document?: string             // CPF/CNPJ
  }
  metadata?: Record<string, string>
  invoice_url?:  string
  boleto_url?:   string
  pix_qr_code?:  string
}

export interface DomListResponse<T> {
  data:       T[]
  total?:     number
  page?:      number
  per_page?:  number
  last_page?:  number
}

// ── Helpers ────────────────────────────────────────────────────

/** Converte centavos para reais */
export function domAmountToReal(cents: number): number {
  return cents / 100
}

/** Status Dom → status interno Zero Churn */
export function domStatusToPayment(status: DomTransactionStatus): 'em_dia' | 'vencendo' | 'inadimplente' {
  if (['APPROVED'].includes(status)) return 'em_dia'
  if (['OVERDUE', 'CHARGEBACK', 'DISPUTE'].includes(status)) return 'inadimplente'
  return 'vencendo'
}

// ── Endpoints ──────────────────────────────────────────────────

/**
 * Lista transações — filtrando por período
 */
export async function listTransactions(
  credentials: DomCredentials,
  params: {
    start_date?: string   // YYYY-MM-DD
    end_date?:   string
    status?:     DomTransactionStatus | DomTransactionStatus[]
    page?:       number
    per_page?:   number
  } = {}
): Promise<DomListResponse<DomTransaction>> {
  const qs = new URLSearchParams()
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date)   qs.set('end_date',   params.end_date)
  if (params.page)       qs.set('page',       String(params.page))
  qs.set('per_page', String(params.per_page ?? 100))

  const statuses = Array.isArray(params.status) ? params.status : params.status ? [params.status] : []
  statuses.forEach(s => qs.append('status[]', s))

  return domRequest<DomListResponse<DomTransaction>>(
    `/transactions?${qs.toString()}`,
    credentials
  )
}

/**
 * Busca todas as transações de um período (com paginação automática)
 */
export async function fetchAllTransactions(
  credentials: DomCredentials,
  startDate: string,
  endDate:   string,
): Promise<DomTransaction[]> {
  const all: DomTransaction[] = []
  let page = 1
  let hasMore = true

  while (hasMore && page <= 20) {
    const res = await listTransactions(credentials, {
      start_date: startDate,
      end_date:   endDate,
      page,
      per_page:   100,
    })
    all.push(...res.data)

    const lastPage = res.last_page ?? 1
    hasMore = page < lastPage
    page++
  }

  return all
}

/**
 * Consulta uma transação específica
 */
export async function getTransaction(
  credentials: DomCredentials,
  id: string
): Promise<DomTransaction> {
  return domRequest<DomTransaction>(`/transactions/${id}`, credentials)
}

/**
 * Testa se o token é válido — tenta listar 1 transação
 */
export async function testCredentials(credentials: DomCredentials): Promise<boolean> {
  try {
    await listTransactions(credentials, { per_page: 1 })
    return true
  } catch {
    return false
  }
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
  event:       DomWebhookEvent
  webhook_code?: string
  data:         DomTransaction | Record<string, unknown>
  created_at?:  string
}

/** Eventos que geram alertas de alta severidade no Zero Churn */
export const DOM_HIGH_SEVERITY_EVENTS: DomWebhookEvent[] = [
  'CHARGE-CHARGEBACK',
  'CHARGE-DISPUT',
  'CHARGE-REJECTED_ANTIFRAUD',
  'SIGNATURE-CANCELLED',
  'SIGNATURE-INVOICE-FAILED',
]

/** Eventos que geram alertas de média severidade */
export const DOM_MEDIUM_SEVERITY_EVENTS: DomWebhookEvent[] = [
  'CHARGE-REFUND',
  'CHARGE-NOT_AUTHORIZED',
  'CHARGE-EXPIRE',
  'CHARGE-DISPUTE_PENDING',
]

/** Label legível para cada evento */
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
