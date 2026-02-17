/**
 * Funções de estatística que operam sobre qualquer Client[]
 * Substitui os helpers do mock-data.ts para uso com dados reais
 */
import type { Client, ChurnRisk } from '@/types'
import { isInObservation } from '@/lib/nps-utils'
import { getNpsClassification } from '@/lib/nps-utils'

// ─── Ordenação ────────────────────────────────────────────────
const RISK_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, observacao: 3 }

export function sortClientsByRisk(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => {
    const ra = a.healthScore?.churnRisk ?? 'observacao'
    const rb = b.healthScore?.churnRisk ?? 'observacao'
    return (RISK_ORDER[ra] ?? 3) - (RISK_ORDER[rb] ?? 3)
  })
}

// ─── Contagens ────────────────────────────────────────────────
export function getRiskCounts(clients: Client[]) {
  return clients.reduce(
    (acc, c) => {
      const risk = c.healthScore?.churnRisk ?? 'observacao'
      acc[risk as ChurnRisk] = (acc[risk as ChurnRisk] ?? 0) + 1
      return acc
    },
    { high: 0, medium: 0, low: 0, observacao: 0 } as Record<ChurnRisk, number>
  )
}

export function getAverageHealthScore(clients: Client[]): number {
  const withScore = clients.filter(c => c.healthScore)
  if (!withScore.length) return 0
  return Math.round(withScore.reduce((s, c) => s + c.healthScore!.scoreTotal, 0) / withScore.length)
}

// ─── Financeiro ───────────────────────────────────────────────
export function getClientValue(c: Client): number {
  return c.clientType === 'mrr' ? (c.mrrValue ?? 0) : (c.tcvValue ?? 0)
}

export function getTotalMRR(clients: Client[]): number {
  return clients
    .filter(c => c.clientType === 'mrr' && c.status !== 'inactive')
    .reduce((s, c) => s + (c.mrrValue ?? 0), 0)
}

export function getTotalTCVInExecution(clients: Client[]): number {
  return clients
    .filter(c => c.clientType === 'tcv' && c.status !== 'inactive')
    .reduce((s, c) => s + (c.tcvValue ?? 0), 0)
}

export function getMRRAtRisk(clients: Client[]): number {
  return clients
    .filter(c => c.clientType === 'mrr' && c.healthScore?.churnRisk === 'high')
    .reduce((s, c) => s + (c.mrrValue ?? 0), 0)
}

export function getRevenueByRisk(clients: Client[]) {
  return clients.reduce(
    (acc, c) => {
      const risk = c.healthScore?.churnRisk ?? 'observacao'
      const val  = getClientValue(c)
      acc[risk as ChurnRisk] = (acc[risk as ChurnRisk] ?? 0) + val
      return acc
    },
    { high: 0, medium: 0, low: 0, observacao: 0 } as Record<ChurnRisk, number>
  )
}

// ─── Filtros ──────────────────────────────────────────────────
export function getMRRClients(clients: Client[]) {
  return clients.filter(c => c.clientType === 'mrr')
}

export function getTCVClients(clients: Client[]) {
  return clients.filter(c => c.clientType === 'tcv')
}

export function getClientsRenewingSoon(clients: Client[], days: number) {
  const now     = new Date()
  const cutoff  = new Date(now.getTime() + days * 86400000)
  return clients.filter(c => {
    if (!c.contractEndDate || c.status === 'inactive') return false
    const end = new Date(c.contractEndDate)
    return end >= now && end <= cutoff
  }).map(c => ({
    ...c,
    contractValue: getClientValue(c),
  }))
}

export function getTCVExpiringSoon(clients: Client[], days: number) {
  return getClientsRenewingSoon(getTCVClients(clients), days)
}

export function getNewTCVClients(clients: Client[], days: number) {
  const since = new Date(Date.now() - days * 86400000)
  return clients.filter(c => c.clientType === 'tcv' && new Date(c.createdAt) >= since)
}

export function getClientsWithIntegrationErrors(clients: Client[]) {
  return clients.filter(c =>
    c.integrations.some(i => i.status === 'error' || i.status === 'disconnected')
  )
}

export function getClientsWithPendingForms(clients: Client[]) {
  return clients.filter(c => {
    if (!c.lastFormSubmission) return false
    return c.lastFormSubmission.status === 'pending'
  })
}

export function getClientsWithoutRecentNPS(clients: Client[], days = 60) {
  const since = new Date(Date.now() - days * 86400000)
  return clients.filter(c => {
    if (isInObservation(c.createdAt)) return false
    const lastResp = c.lastFormSubmission?.respondedAt
    if (!lastResp) return true
    return new Date(lastResp) < since
  })
}

// ─── NPS ──────────────────────────────────────────────────────
export function getNpsDistribution(clients: Client[]) {
  const withNps = clients.filter(c => c.lastFormSubmission?.npsScore !== undefined)
  let promotores = 0, neutros = 0, detratores = 0

  withNps.forEach(c => {
    const score = c.lastFormSubmission!.npsScore!
    const cls   = getNpsClassification(score)
    if (cls.label === 'Promotor')  promotores++
    if (cls.label === 'Neutro')    neutros++
    if (cls.label === 'Detrator')  detratores++
  })

  const total    = withNps.length || 1
  const npsScore = Math.round(((promotores - detratores) / total) * 100)
  const avgScore = withNps.length
    ? Math.round(withNps.reduce((s, c) => s + c.lastFormSubmission!.npsScore!, 0) / withNps.length)
    : 0

  return {
    promotores, neutros, detratores,
    semResposta: clients.length - withNps.length,
    total: clients.length,
    npsScore,
    avgScore,
  }
}

// ─── Pagamentos ───────────────────────────────────────────────
export function getPaymentStatusSummary(clients: Client[]) {
  const active = clients.filter(c => c.status !== 'inactive' && c.clientType === 'mrr')

  const emDia      = active.filter(c => c.paymentStatus === 'em_dia')
  const vencendo   = active.filter(c => c.paymentStatus === 'vencendo')
  const inadimplente = active.filter(c => c.paymentStatus === 'inadimplente')

  const sum = (arr: Client[]) => arr.reduce((s, c) => s + (c.mrrValue ?? 0), 0)

  return {
    emDia:       { count: emDia.length,       value: sum(emDia) },
    vencendo:    { count: vencendo.length,     value: sum(vencendo) },
    inadimplente:{ count: inadimplente.length, value: sum(inadimplente) },
    totalAtRisk: sum(vencendo) + sum(inadimplente),
  }
}

// ─── Forecast ─────────────────────────────────────────────────
export function getMonthlyBillingForecast(clients: Client[]) {
  const mrr     = getTotalMRR(clients)
  const atRisk  = getMRRAtRisk(clients)
  return {
    confirmed: mrr - atRisk,
    atRisk,
    total: mrr,
  }
}
