// ─────────────────────────────────────────────
// TIPOS GLOBAIS DO ZERO CHURN
// ─────────────────────────────────────────────

export type ChurnRisk = 'low' | 'medium' | 'high' | 'observacao'
export type ClientType = 'mrr' | 'tcv'
export type PaymentStatus = 'em_dia' | 'vencendo' | 'inadimplente'
export type ClientStatus = 'active' | 'inactive'

export type ChurnCategory =
  | 'price'         // Preço / custo-benefício não percebido
  | 'results'       // Resultados abaixo do esperado
  | 'communication' // Falta de comunicação / atendimento
  | 'closed'        // Empresa encerrou ou pausou operações
  | 'competitor'    // Migrou para concorrente
  | 'internal'      // Mudança interna (troca de equipe, gestão)
  | 'project_end'   // Projeto TCV concluído sem renovação
  | 'other'         // Outro motivo

export interface ChurnRecord {
  category: ChurnCategory
  detail: string
  inactivatedAt: string     // ISO date
  inactivatedBy?: string    // nome do usuário
}
export type IntegrationStatus = 'connected' | 'error' | 'expired' | 'disconnected'
export type IntegrationType = 'whatsapp' | 'asaas' | 'dom_pagamentos' | 'meta_ads' | 'google_ads'
export type AlertSeverity = 'high' | 'medium' | 'low'
export type TriggeredBy = 'scheduled' | 'manual'
export type Trend = 'improving' | 'stable' | 'declining'

// ─────────────────────────────────────────────

// ─────────────────────────────────────────────

export type FormQuestionType = 'scale' | 'text' | 'multiple_choice'

export interface FormQuestion {
  id: string
  type: FormQuestionType
  text: string
  required: boolean
  locked: boolean           // perguntas obrigatórias não podem ser removidas
  options?: string[]        // para múltipla escolha
  placeholder?: string
}

// ─────────────────────────────────────────────

export interface ServiceItem {
  id: string
  name: string
}

export interface Service {
  id: string
  agencyId: string
  name: string              // nome do método/produto vendido
  description?: string
  type: 'mrr' | 'tcv'
  entregaveis: ServiceItem[]
  bonus: ServiceItem[]
  isActive: boolean
}

// ─────────────────────────────────────────────

export interface Agency {
  id: string
  name: string
  logo?: string
  schedulerDay: number
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

export interface Address {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
}

export interface Installment {
  id: string
  number: number
  dueDate: string
  value: number
  status: 'pending' | 'overdue'
}

export interface Client {
  id: string
  agencyId: string

  // Identificação
  razaoSocial: string
  nomeResumido: string        // usado em todo o sistema
  name: string                // alias de nomeResumido (compatibilidade)
  cnpjCpf: string
  nomeDecisor: string
  telefone: string
  email: string
  emailFinanceiro?: string
  segment: string

  // Endereço de cobrança
  address?: Address

  // Tipo de contrato
  clientType: ClientType
  serviceSold: string

  // MRR
  contractValue: number
  contractStartDate: string
  contractEndDate: string
  hasImplementationFee?: boolean
  implementationFeeValue?: number
  implementationFeeDate?: string

  // TCV
  totalProjectValue?: number
  projectDeadlineDays?: number
  projectStartDate?: string
  hasInstallments?: boolean
  installmentsType?: 'equal' | 'custom'
  installments?: Installment[]

  // Contexto & Briefing (alimenta IA + equipe operacional)
  nichoEspecifico?: string        // descrição mais detalhada do nicho
  resumoReuniao?: string          // o que foi discutido no fechamento
  expectativasCliente?: string    // o que o cliente disse que espera
  principaisDores?: string        // problemas que motivaram a contratação
  notes?: string                  // observações adicionais da equipe
  paymentStatus?: PaymentStatus   // status do pagamento mais recente

  // Status do cliente
  status?: ClientStatus           // active (default) | inactive
  churnRecord?: ChurnRecord       // preenchido ao inativar

  createdAt: string
}

export interface Integration {
  id: string
  clientId: string
  type: IntegrationType
  status: IntegrationStatus
  lastSyncAt?: string
  metadata?: Record<string, string>  // groupId, customerId, accountId, etc.
}

export interface FormSubmission {
  id: string
  clientId: string
  formLinkToken: string
  sentAt: string
  respondedAt?: string
  resultScore?: number
  npsScore?: number
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
