/**
 * Agente Resultado e NPS — Sprint 3, Tasks S3-04, S3-05, S3-06
 *
 * Calcula dois scores a partir das respostas do formulário de satisfação:
 *   - Score Resultado (peso 25%): "Qual o impacto dos nossos serviços nos seus resultados?"
 *   - Score NPS (peso 10%): "Qual a chance de nos indicar?"
 *
 * CADÊNCIA: Mensal — o formulário é enviado 1x por mês pela agência.
 * A análise de Health Score roda semanalmente mas este agente opera
 * sobre os dados mensais acumulados (janela de 90 dias).
 *
 * REGRAS DE SCORING (sem IA — lógica pura):
 *
 * Score Resultado (0–100):
 *   - Baseado na média das notas de resultado dos últimos 90 dias
 *   - Normalizado: nota × 10 (0-10 → 0-100)
 *   - Penalidade por não resposta:
 *       - Sem formulário respondido nos últimos 90 dias: pilar ausente (null)
 *       - Sem formulário respondido nos últimos 30 dias: -10 pts (aviso)
 *
 * Score NPS (0–100):
 *   - Baseado na média das notas NPS dos últimos 90 dias
 *   - Normalizado: nota × 10
 *   - Penalidade por não resposta: mesma regra acima
 *
 * FLAGS CRÍTICOS:
 *   - 'nps_detractor'       — NPS ≤ 6 na última resposta
 *   - 'nps_consecutive_low' — 2 respostas consecutivas NPS ≤ 6
 *   - 'no_form_response'    — sem formulário respondido nos últimos 90 dias
 *   - 'form_silence'        — cliente NPS detrator + sem resposta nos últimos 30 dias
 */

import type { AgentResult } from './types'

// ── Tipos de entrada ──────────────────────────────────────────────

interface FormSubmission {
  id:             string
  submittedAt:    string  // ISO datetime
  npsScore:       number  // 0–10
  scoreResultado: number  // 0–10
  comment:        string | null
}

interface NpsInput {
  clientId:     string
  submissions:  FormSubmission[]
  /** Data de referência (padrão: hoje) */
  referenceDate?: string
}

// ── Helpers ───────────────────────────────────────────────────────

function daysSince(dateStr: string, reference: string): number {
  return Math.floor(
    (new Date(reference).getTime() - new Date(dateStr).getTime()) / 86400000
  )
}

// ── Agente principal ──────────────────────────────────────────────

export async function runAgenteNps(input: NpsInput): Promise<{
  resultado: AgentResult
  nps:       AgentResult
}> {
  const startMs     = Date.now()
  const reference   = input.referenceDate ?? new Date().toISOString().slice(0, 10)

  // Ordena por data desc
  const sorted = [...input.submissions].sort(
    (a, b) => b.submittedAt.localeCompare(a.submittedAt)
  )

  // Respostas dos últimos 90 dias (histórico) e 30 dias (mensal recente)
  const last90 = sorted.filter(s => daysSince(s.submittedAt.slice(0, 10), reference) <= 90)
  const last30 = sorted.filter(s => daysSince(s.submittedAt.slice(0, 10), reference) <= 30)

  const hasResponse90 = last90.length > 0
  const hasResponse30 = last30.length > 0

  // ── Score Resultado ───────────────────────────────────────────────

  const resultadoFlags:   string[] = []
  let   scoreResultado:   number | null = null
  const resultadoDetails: Record<string, unknown> = {}

  if (!hasResponse90) {
    resultadoFlags.push('no_form_response')
    scoreResultado = null  // sem dados — pilar ausente
    resultadoDetails.reason = 'Nenhuma resposta nos últimos 90 dias'
  } else {
    const avgResultado = last90.reduce((s, f) => s + f.scoreResultado, 0) / last90.length
    scoreResultado = Math.round(avgResultado * 10)  // 0-10 → 0-100

    // Penalidade por não ter resposta no último mês (30 dias)
    if (!hasResponse30) {
      scoreResultado = Math.max(0, scoreResultado - 10)
      resultadoDetails.penaltyNoRecentResponse = true
    }

    resultadoDetails.avgResultado = avgResultado
    resultadoDetails.responses    = last90.length
    resultadoDetails.lastResponse = sorted[0]?.submittedAt ?? null
  }

  // ── Score NPS ─────────────────────────────────────────────────────

  const npsFlags:   string[] = []
  let   scoreNps:   number | null = null
  const npsDetails: Record<string, unknown> = {}

  if (!hasResponse90) {
    npsFlags.push('no_form_response')
    scoreNps = null
    npsDetails.reason = 'Nenhuma resposta nos últimos 90 dias'
  } else {
    const avgNps = last90.reduce((s, f) => s + f.npsScore, 0) / last90.length
    scoreNps = Math.round(avgNps * 10)  // 0-10 → 0-100

    if (!hasResponse30) {
      scoreNps = Math.max(0, scoreNps - 10)
      npsDetails.penaltyNoRecentResponse = true
    }

    const lastNps = sorted[0]?.npsScore ?? null
    npsDetails.avgNps       = avgNps
    npsDetails.lastNps      = lastNps
    npsDetails.responses    = last90.length
    npsDetails.lastResponse = sorted[0]?.submittedAt ?? null

    // Flag: Detrator na última resposta
    if (lastNps !== null && lastNps <= 6) {
      npsFlags.push('nps_detractor')
    }

    // Flag: 2 detratores consecutivos
    const lastTwo = sorted.slice(0, 2)
    if (lastTwo.length === 2 && lastTwo[0].npsScore <= 6 && lastTwo[1].npsScore <= 6) {
      npsFlags.push('nps_consecutive_low')
    }

    // Flag combinada: detrator + silêncio no último mês
    if (npsFlags.includes('nps_detractor') && !hasResponse30) {
      npsFlags.push('form_silence')
    }
  }

  const durationMs = Date.now() - startMs

  return {
    resultado: {
      agent:   'resultado',
      score:   scoreResultado,
      flags:   resultadoFlags,
      details: resultadoDetails,
      status:  hasResponse90 ? 'success' : 'skipped',
      durationMs,
    },
    nps: {
      agent:   'nps',
      score:   scoreNps,
      flags:   npsFlags,
      details: npsDetails,
      status:  hasResponse90 ? 'success' : 'skipped',
      durationMs,
    },
  }
}
