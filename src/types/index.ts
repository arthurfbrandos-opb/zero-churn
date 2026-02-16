// ─────────────────────────────────────────────
// TIPOS GLOBAIS DO ZERO CHURN
// ─────────────────────────────────────────────

export type ChurnRisk = 'low' | 'medium' | 'high' | 'observacao'

export type ClientType = 'mrr' | 'tcv'

export type IntegrationStatus = 'connected' | 'error' | 'expired' | 'disconnected'

export type IntegrationType = 'whatsapp' | 'asaas' | 'dom_pagamentos'

export type AlertSeverity = 'high' | 'medium' | 'low'

export type TriggeredBy = 'scheduled' | 'manual'

export type Trend = 'improving' | 'stable' | 'declining'

// ─────────────────────────────────────────────

export interface Agency {
  id: string
  name: string
  logo?: string
  schedulerDay: number // 1–28
  plan: 'starter' | 'growth' | 'agency' | 'enterprise'
  createdAt: string
}

export interface User {
  id: string
  agencyId: string
  name: string
  email: string
  role: 'admin' | 'viewer'
  createdAt: string
}

export interface Client {
  id: string
  agencyId: string
  name: string
  segment: string
  serviceSold: string
  clientType: ClientType

  // MRR
  contractValue: number        // valor mensal recorrente
  contractStartDate: string
  contractEndDate: string

  // TCV (preenchido apenas se clientType === 'tcv')
  totalProjectValue?: number   // valor total do projeto pago antecipado
  projectDeadlineDays?: number // duração total em dias (ex: 90)
  projectStartDate?: string    // início da execução

  notes?: string
  createdAt: string
}

export interface Integration {
  id: string
  clientId: string
  type: IntegrationType
  status: IntegrationStatus
  lastSyncAt?: string
}

export interface FormSubmission {
  id: string
  clientId: string
  formLinkToken: string
  sentAt: string
  respondedAt?: string
  resultScore?: number   // 0–10
  npsScore?: number      // 0–10
  comment?: string
  daysToRespond?: number
}

export interface PillarScore {
  score: number
  weight: number
  contribution: number
  trend: Trend
}

export interface HealthScore {
  id: string
  clientId: string
  calculatedAt: string
  scoreTotal: number
  pillars: {
    financial: PillarScore
    proximity: PillarScore
    result: PillarScore
    nps: PillarScore
  }
  churnRisk: ChurnRisk
  criticalFlags: string[]
  diagnosis: string
  actionPlan: ActionItem[]
  triggeredBy: TriggeredBy
}

export interface ActionItem {
  id: string
  text: string
  done: boolean
  doneAt?: string
  doneBy?: string
}

export interface Alert {
  id: string
  clientId: string
  clientName: string
  type: string
  severity: AlertSeverity
  message: string
  isRead: boolean
  createdAt: string
}

export interface ClientWithScore extends Client {
  healthScore?: HealthScore
  integrations: Integration[]
  lastFormSubmission?: FormSubmission
}
