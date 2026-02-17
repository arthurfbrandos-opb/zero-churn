/**
 * Asaas API Client
 * Documentação: https://docs.asaas.com/reference
 *
 * A API key vem do banco de dados (agency_integrations), criptografada.
 * Nunca fica em variável de ambiente de produção.
 */

const BASE_URL = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'

// Recebe apiKey como parâmetro — vem do banco, nunca hardcoded
async function asaasRequest<T>(path: string, apiKey: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'access_token': apiKey,
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
  id:               string
  name:             string
  cpfCnpj:          string | null
  email:            string | null
  phone:            string | null
  mobilePhone:      string | null
  additionalEmails: string | null  // emails extras separados por vírgula — usado como email financeiro
  address:          string | null
  addressNumber:    string | null
  complement:       string | null
  province:         string | null  // bairro no Asaas
  postalCode:       string | null
  city:             string | null   // ID numérico da cidade — NÃO usar
  cityName:         string | null   // nome legível — usar este
  state:            string | null
  externalReference: string | null
  notificationDisabled: boolean
  deleted:          boolean
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
export async function listCustomers(apiKey: string, limit = 100, offset = 0) {
  return asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?limit=${limit}&offset=${offset}&deleted=false`,
    apiKey
  )
}

/** Busca um customer completo — inclui additionalEmails, endereço, etc. */
export async function getCustomer(apiKey: string, customerId: string): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>(`/customers/${customerId}`, apiKey)
}

export async function findCustomerByCpfCnpj(apiKey: string, cpfCnpj: string) {
  const cleaned = cpfCnpj.replace(/\D/g, '')
  const res = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?cpfCnpj=${cleaned}&limit=10`,
    apiKey
  )
  return res.data[0] ?? null
}

export async function findCustomerByName(apiKey: string, name: string) {
  const res = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?name=${encodeURIComponent(name)}&limit=10`,
    apiKey
  )
  return res.data[0] ?? null
}

export async function getCustomerPayments(apiKey: string, customerId: string, limit = 20) {
  return asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/payments?customer=${customerId}&limit=${limit}&sort=dueDate&order=desc`,
    apiKey
  )
}

export async function getOverduePayments(apiKey: string, customerId: string) {
  return asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/payments?customer=${customerId}&status=OVERDUE&limit=20`,
    apiKey
  )
}

/**
 * Retorna IDs únicos de customers que tiveram pagamento pago nos últimos N dias
 * Usa os status: RECEIVED, CONFIRMED, RECEIVED_IN_CASH
 */
export interface AsaasSubscription {
  id: string
  customer: string
  value: number
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
  nextDueDate: string
  description: string | null
}

/**
 * Busca assinaturas ativas de um customer — usada para determinar o MRR
 */
export async function getActiveSubscriptions(apiKey: string, customerId: string) {
  return asaasRequest<AsaasListResponse<AsaasSubscription>>(
    `/subscriptions?customer=${customerId}&status=ACTIVE&limit=10`,
    apiKey
  )
}

/**
 * Retorna o valor mensal recorrente de um customer (0 se não tiver assinatura ativa)
 */
export async function getCustomerMrr(apiKey: string, customerId: string): Promise<number> {
  try {
    const res = await getActiveSubscriptions(apiKey, customerId)
    if (!res.data.length) return 0

    return res.data.reduce((total, sub) => {
      // Normaliza tudo para valor mensal
      const monthly = (() => {
        switch (sub.cycle) {
          case 'WEEKLY':       return sub.value * 4.33
          case 'BIWEEKLY':     return sub.value * 2.17
          case 'MONTHLY':      return sub.value
          case 'QUARTERLY':    return sub.value / 3
          case 'SEMIANNUALLY': return sub.value / 6
          case 'YEARLY':       return sub.value / 12
          default:             return sub.value
        }
      })()
      return total + monthly
    }, 0)
  } catch {
    return 0
  }
}

export async function getActiveCustomerIds(apiKey: string, days = 90): Promise<Set<string>> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10) // YYYY-MM-DD

  const activeIds = new Set<string>()
  let offset = 0
  let hasMore = true

  // Busca até 1000 pagamentos pagos no período (10 páginas de 100)
  while (hasMore && offset < 1000) {
    const res = await asaasRequest<AsaasListResponse<AsaasPayment>>(
      `/payments?paymentDate[ge]=${sinceStr}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100&offset=${offset}`,
      apiKey
    )
    res.data.forEach(p => activeIds.add(p.customer))
    hasMore = res.hasMore
    offset += 100
  }

  return activeIds
}

// ── Criação de recursos ───────────────────────────────────────

export interface CreateCustomerInput {
  name:          string
  cpfCnpj?:      string | null
  email?:        string | null
  phone?:        string | null
  mobilePhone?:  string | null
  address?:      string | null
  addressNumber?: string | null
  complement?:   string | null
  province?:     string | null
  postalCode?:   string | null
  state?:        string | null
}

/** Cria um customer na conta Asaas */
export async function createCustomer(apiKey: string, data: CreateCustomerInput): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>('/customers', apiKey, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export type BillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED'
export type SubscriptionCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'

export interface CreatePaymentInput {
  customer:     string        // customer id
  billingType:  BillingType
  value:        number
  dueDate:      string        // 'YYYY-MM-DD'
  description?: string
}

export interface AsaasCreatedPayment {
  id:           string
  invoiceUrl:   string | null
  bankSlipUrl:  string | null
  status:       string
  value:        number
}

/** Cria uma cobrança avulsa no Asaas */
export async function createPayment(apiKey: string, data: CreatePaymentInput): Promise<AsaasCreatedPayment> {
  return asaasRequest<AsaasCreatedPayment>('/payments', apiKey, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface CreateSubscriptionInput {
  customer:     string
  billingType:  BillingType
  value:        number
  nextDueDate:  string        // 'YYYY-MM-DD' — próximo vencimento
  cycle:        SubscriptionCycle
  description?: string
}

export interface AsaasCreatedSubscription {
  id:          string
  status:      string
  value:       number
  cycle:       string
  nextDueDate: string
}

/** Cria uma assinatura recorrente no Asaas */
export async function createSubscription(apiKey: string, data: CreateSubscriptionInput): Promise<AsaasCreatedSubscription> {
  return asaasRequest<AsaasCreatedSubscription>('/subscriptions', apiKey, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getCustomerFinancialSummary(apiKey: string, customerId: string) {
  const res = await getCustomerPayments(apiKey, customerId, 50)
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
