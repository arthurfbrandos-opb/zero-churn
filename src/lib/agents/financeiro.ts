/**
 * Agente Financeiro — Sprint 3, Tasks S3-01, S3-02, S3-03
 *
 * Analisa o comportamento de pagamento do cliente usando dados
 * já coletados do Asaas e Dom Pagamentos.
 *
 * REGRAS DE SCORING (sem IA — lógica pura):
 *
 * Base: 100 pontos
 * Penalidades:
 *   - Pagamento OVERDUE (em atraso):
 *       - 1–7 dias:   -10 pts
 *       - 8–30 dias:  -20 pts
 *       - 31+ dias:   -35 pts
 *   - 2 atrasos consecutivos:   -15 pts extras
 *   - Chargeback detectado:      -40 pts (flag crítico)
 *   - Cancelamento detectado:    -30 pts (flag crítico)
 *
 * FLAGS CRÍTICOS:
 *   - 'chargeback'           — pagamento estornado
 *   - 'consecutive_overdue'  — 2+ atrasos consecutivos no histórico
 *   - 'long_overdue'         — atraso > 30 dias
 *   - 'no_payment_data'      — sem dados financeiros integrados
 */

import type { AgentResult } from './types'

// ── Tipos internos ────────────────────────────────────────────────

interface PaymentRow {
  id:         string
  status:     string       // RECEIVED | CONFIRMED | RECEIVED_IN_CASH | PENDING | OVERDUE | REFUNDED | CHARGEBACK_REQUESTED | CHARGEBACK_DISPUTE
  dueDate:    string       // ISO date
  paymentDate: string | null
  value:      number       // valor bruto
  netValue:   number       // valor líquido
  fonte:      'asaas' | 'dom'
}

interface FinanceiroInput {
  clientId:   string
  /** Pagamentos do Asaas (já buscados e normalizados) */
  asaasPayments: PaymentRow[]
  /** Pagamentos do Dom (já buscados e normalizados) */
  domPayments:   PaymentRow[]
  /** Período de análise (ISO date) */
  startDate:  string
  endDate:    string
}

// ── Helpers ───────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.abs(
    Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
  )
}

function isChargebackStatus(status: string): boolean {
  return ['CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'CHARGEBACK', 'REFUNDED'].includes(status)
}

function isOverdue(status: string): boolean {
  return status === 'OVERDUE'
}

// ── Agente principal ──────────────────────────────────────────────

export async function runAgenteFinanceiro(input: FinanceiroInput): Promise<AgentResult> {
  const startMs = Date.now()

  console.log(`[financeiro] Input received:`, {
    clientId: input.clientId,
    asaasPayments: input.asaasPayments.length,
    domPayments: input.domPayments.length,
    period: `${input.startDate} to ${input.endDate}`
  })

  const allPayments = [...input.asaasPayments, ...input.domPayments]

  // Sem dados: retorna score null + flag
  if (allPayments.length === 0) {
    console.warn(`[financeiro] No payment data found for client ${input.clientId}`)
    return {
      agent:   'financeiro',
      score:   null,
      flags:   ['no_payment_data'],
      details: { reason: 'Nenhum dado financeiro integrado para este cliente' },
      status:  'skipped',
      durationMs: Date.now() - startMs,
    }
  }

  let score      = 100
  const flags:   string[] = []
  const details: Record<string, unknown> = {}

  // ── Chargebacks ──────────────────────────────────────────────────
  const chargebacks = allPayments.filter(p => isChargebackStatus(p.status))
  if (chargebacks.length > 0) {
    score -= 40
    flags.push('chargeback')
    details.chargebacks = chargebacks.length
  }

  // ── Overdue (em atraso) ───────────────────────────────────────────
  const overdues = allPayments.filter(p => isOverdue(p.status))
  const today    = new Date().toISOString().slice(0, 10)

  let   totalOverduePenalty = 0
  const overdueDetails: { id: string; daysLate: number; value: number }[] = []

  for (const p of overdues) {
    const daysLate = daysBetween(today, p.dueDate)
    overdueDetails.push({ id: p.id, daysLate, value: p.netValue })

    if (daysLate <= 7)       totalOverduePenalty += 10
    else if (daysLate <= 30) totalOverduePenalty += 20
    else {
      totalOverduePenalty += 35
      if (!flags.includes('long_overdue')) flags.push('long_overdue')
    }
  }

  // Limita a penalidade de overdue a no máximo 50 pts (não zera o score)
  score -= Math.min(totalOverduePenalty, 50)

  if (overdueDetails.length > 0) {
    details.overdues = overdueDetails
  }

  // ── Atrasos consecutivos ─────────────────────────────────────────
  // Ordena por vencimento e verifica se 2 consecutivos foram OVERDUE
  const sortedByDue = [...allPayments]
    .filter(p => p.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  let consecutiveOverdues = 0
  let maxConsecutive      = 0
  for (const p of sortedByDue) {
    if (isOverdue(p.status)) {
      consecutiveOverdues++
      maxConsecutive = Math.max(maxConsecutive, consecutiveOverdues)
    } else if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status)) {
      consecutiveOverdues = 0
    }
  }

  if (maxConsecutive >= 2) {
    score -= 15
    flags.push('consecutive_overdue')
    details.maxConsecutiveOverdues = maxConsecutive
  }

  // ── Score final (clamp 0–100) ─────────────────────────────────────
  score = Math.max(0, Math.min(100, score))

  // ── Detalhes do resumo ───────────────────────────────────────────
  const received = allPayments.filter(p =>
    ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status)
  )
  const pending = allPayments.filter(p => p.status === 'PENDING')

  // ── Recência (últimos 7 dias — análise semanal) ───────────────────
  const today7dCutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const recentOverdues = overdues.filter(p => p.dueDate >= today7dCutoff)
  const recentChargebacks = chargebacks.filter(p => p.dueDate >= today7dCutoff)

  if (recentOverdues.length > 0) {
    details.recentIssue       = 'overdue_this_week'
    details.recentOverdueCount = recentOverdues.length
  }
  if (recentChargebacks.length > 0) {
    details.recentIssue = 'chargeback_this_week'
  }

  details.totalPayments  = allPayments.length
  details.received       = received.length
  details.pending        = pending.length
  details.overdue        = overdues.length
  details.totalReceived  = received.reduce((s, p) => s + p.netValue, 0)
  details.totalOverdue   = overdues.reduce((s, p) => s + p.netValue, 0)
  details.fontes         = {
    asaas: input.asaasPayments.length,
    dom:   input.domPayments.length,
  }

  return {
    agent:      'financeiro',
    score,
    flags,
    details,
    status:     'success',
    durationMs: Date.now() - startMs,
  }
}
