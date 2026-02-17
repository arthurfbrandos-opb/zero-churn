/**
 * Asaas API Client
 * Documentação: https://docs.asaas.com/reference
 */

const BASE_URL  = process.env.ASAAS_API_URL  ?? 'https://api.asaas.com/v3'
const API_KEY   = process.env.ASAAS_API_KEY  ?? ''

async function asaasRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'access_token': API_KEY,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    next: { revalidate: 0 }, // nunca cacheia — dados financeiros precisam ser fresh
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      `Asaas API ${res.status}: ${body?.errors?.[0]?.description ?? res.statusText}`
    )
  }

  return res.json()
}

// ── Tipos ──────────────────────────────────────────────────────

export interface AsaasCustomer {
  id:            string
  name:          string
  cpfCnpj:       string | null
  email:         string | null
  phone:         string | null
  mobilePhone:   string | null
  address:       string | null
  city:          string | null
  state:         string | null
  externalReference: string | null
  notificationDisabled: boolean
  deleted:       boolean
}

export interface AsaasPayment {
  id:            string
  customer:      string   // customer id
  value:         number
  netValue:      number
  dueDate:       string   // 'YYYY-MM-DD'
  paymentDate:   string | null
  status:        AsaasPaymentStatus
  billingType:   string
  description:   string | null
  invoiceUrl:    string | null
  bankSlipUrl:   string | null
  pixQrCodeUrl:  string | null
}

export type AsaasPaymentStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'RECEIVED_IN_CASH'
  | 'REFUND_REQUESTED'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DUNNING_REQUESTED'
  | 'DUNNING_RECEIVED'
  | 'AWAITING_RISK_ANALYSIS'

export interface AsaasListResponse<T> {
  object:    string
  hasMore:   boolean
  totalCount: number
  limit:     number
  offset:    number
  data:      T[]
}

// ── Endpoints ─────────────────────────────────────────────────

/**
 * Lista clientes (customers) da conta Asaas
 * @param limit  max 100 por página
 * @param offset paginação
 */
export async function listCustomers(limit = 100, offset = 0) {
  return asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?limit=${limit}&offset=${offset}&deleted=false`
  )
}

/**
 * Busca um customer pelo CNPJ/CPF
 */
export async function findCustomerByCpfCnpj(cpfCnpj: string) {
  const cleaned = cpfCnpj.replace(/\D/g, '')
  const res = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?cpfCnpj=${cleaned}&limit=10`
  )
  return res.data[0] ?? null
}

/**
 * Busca um customer pelo nome (busca parcial)
 */
export async function findCustomerByName(name: string) {
  const res = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?name=${encodeURIComponent(name)}&limit=10`
  )
  return res.data[0] ?? null
}

/**
 * Busca pagamentos de um customer específico
 * @param customerId  id do customer no Asaas
 * @param limit       max 100 por página
 */
export async function getCustomerPayments(customerId: string, limit = 20) {
  return asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/payments?customer=${customerId}&limit=${limit}&sort=dueDate&order=desc`
  )
}

/**
 * Busca cobranças vencidas de um customer
 */
export async function getOverduePayments(customerId: string) {
  return asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/payments?customer=${customerId}&status=OVERDUE&limit=20`
  )
}

/**
 * Resumo financeiro de um customer para o health score
 * Retorna: status geral, total pago, total em aberto, total vencido, score financeiro (0-100)
 */
export async function getCustomerFinancialSummary(customerId: string) {
  const res = await getCustomerPayments(customerId, 50)
  const payments = res.data

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recent = payments.filter(p => new Date(p.dueDate) >= thirtyDaysAgo)

  const paid    = payments.filter(p => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status))
  const overdue = payments.filter(p => p.status === 'OVERDUE')
  const pending = payments.filter(p => p.status === 'PENDING')

  const totalPaid    = paid.reduce((s, p) => s + p.value, 0)
  const totalOverdue = overdue.reduce((s, p) => s + p.value, 0)
  const totalPending = pending.reduce((s, p) => s + p.value, 0)

  // Dias em atraso (maior atraso entre as cobranças vencidas)
  const maxOverdueDays = overdue.length
    ? Math.max(...overdue.map(p => {
        const due = new Date(p.dueDate)
        return Math.floor((now.getTime() - due.getTime()) / 86400000)
      }))
    : 0

  // Score financeiro (0–100)
  let scoreFinanceiro = 100
  if (overdue.length > 0) {
    if (maxOverdueDays > 60)      scoreFinanceiro = 0
    else if (maxOverdueDays > 30) scoreFinanceiro = 10
    else if (maxOverdueDays > 15) scoreFinanceiro = 30
    else if (maxOverdueDays > 7)  scoreFinanceiro = 50
    else                           scoreFinanceiro = 70
  } else if (pending.length > 0 && recent.some(p => p.status === 'PENDING')) {
    scoreFinanceiro = 85  // tem pendente mas nada vencido
  }

  // Status resumido para o frontend
  let paymentStatus: 'em_dia' | 'vencendo' | 'inadimplente' = 'em_dia'
  if (overdue.length > 0) paymentStatus = 'inadimplente'
  else if (pending.some(p => {
    const due = new Date(p.dueDate)
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / 86400000)
    return daysUntil <= 5
  })) paymentStatus = 'vencendo'

  return {
    customerId,
    paymentStatus,
    scoreFinanceiro,
    totalPaid,
    totalOverdue,
    totalPending,
    maxOverdueDays,
    overdueCount:  overdue.length,
    pendingCount:  pending.length,
    lastPayment:   paid[0] ?? null,
    payments:      payments.slice(0, 10), // últimas 10
  }
}
