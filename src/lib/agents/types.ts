/**
 * Tipos compartilhados entre todos os agentes do Zero Churn.
 */

// ── Resultado de um agente individual ────────────────────────────

export interface AgentResult {
  /** Nome do agente */
  agent: string
  /** Score parcial do pilar (0–100). null = sem dados suficientes. */
  score: number | null
  /** Flags críticos detectados (ex: 'chargeback', 'consecutive_overdue') */
  flags: string[]
  /** Detalhes úteis para o diagnóstico */
  details: Record<string, unknown>
  /** Status de execução */
  status: 'success' | 'skipped' | 'error'
  /** Mensagem de erro, se houver */
  error?: string
  /** Duração em ms */
  durationMs?: number
}

// ── Resultado completo de uma análise ────────────────────────────

export interface AnalysisResult {
  clientId:  string
  agencyId:  string

  /** Scores por pilar (0–100 ou null se não disponível) */
  scoreFinanceiro:  number | null
  scoreProximidade: number | null
  scoreResultado:   number | null
  scoreNps:         number | null

  /** Score total (0–100) — ponderado pelos pesos dos pilares */
  scoreTotal: number

  /** Risco calculado a partir do score total */
  churnRisk:  'low' | 'medium' | 'high'

  /** Flags críticos de todos os pilares */
  flags:      string[]

  /** Log por agente */
  agentsLog:  Record<string, AgentResult>

  /** Diagnóstico gerado pela IA (texto + plano de ação) */
  diagnosis?: string
  actionPlan?: string[]  // lista de ações

  /** Custo estimado (tokens OpenAI) */
  tokensUsed?: number
  costBrl?:    number
}

// ── Pesos dos pilares ─────────────────────────────────────────────

export const PILARES_WEIGHTS = {
  financeiro:  0.35,
  proximidade: 0.30,
  resultado:   0.25,
  nps:         0.10,
} as const

// ── Thresholds de risco ───────────────────────────────────────────

export function calcChurnRisk(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'low'
  if (score >= 40) return 'medium'
  return 'high'
}

// ── Score ponderado ───────────────────────────────────────────────

/**
 * Calcula o score total ponderado.
 * Pilares ausentes (null) não penalizam — só os presentes são usados.
 */
export function calcWeightedScore(scores: {
  financeiro?:  number | null
  proximidade?: number | null
  resultado?:   number | null
  nps?:         number | null
}): number {
  const pairs: [number | null | undefined, number][] = [
    [scores.financeiro,  PILARES_WEIGHTS.financeiro ],
    [scores.proximidade, PILARES_WEIGHTS.proximidade],
    [scores.resultado,   PILARES_WEIGHTS.resultado  ],
    [scores.nps,         PILARES_WEIGHTS.nps        ],
  ]

  let totalWeight = 0
  let weightedSum = 0

  for (const [score, weight] of pairs) {
    if (score !== null && score !== undefined) {
      weightedSum += score * weight
      totalWeight += weight
    }
  }

  if (totalWeight === 0) return 50  // sem dados → score neutro
  return Math.round(weightedSum / totalWeight)
}
