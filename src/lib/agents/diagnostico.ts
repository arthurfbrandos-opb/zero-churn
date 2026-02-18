/**
 * Agente Diagnóstico — Sprint 3, Task S3-12
 *
 * Usa GPT-4o para gerar um diagnóstico textual e um plano de ação
 * baseado nos scores e detalhes dos outros 3 agentes.
 *
 * INPUT:  contexto completo do cliente + resultados dos agentes
 * OUTPUT: { diagnosis: string, actionPlan: string[], tokensUsed: number }
 *
 * Usa response_format: { type: "json_object" } para garantir JSON válido.
 */

import type { AgentResult } from './types'
import { calcChurnRisk } from './types'

// ── Tipos ─────────────────────────────────────────────────────────

export interface DiagnosticoInput {
  clientName:  string
  agencyName:  string
  segment:     string | null
  serviceType: string | null      // ex: "Tráfego Pago + Social Media"
  contractMonths: number          // tempo como cliente em meses
  mrrValue:    number | null      // valor do contrato (R$)

  scoreFinanceiro:  number | null
  scoreProximidade: number | null
  scoreResultado:   number | null
  scoreNps:         number | null
  scoreTotal:       number

  agents: {
    financeiro:  AgentResult
    proximidade: AgentResult
    resultado:   AgentResult
    nps:         AgentResult
  }

  openaiKey: string
}

export interface DiagnosticoOutput {
  diagnosis:   string       // 3–5 parágrafos de diagnóstico
  actionPlan:  string[]     // 3–5 ações concretas e priorizadas
  tokensUsed:  number
}

// ── Prompt builder ────────────────────────────────────────────────

function buildPrompt(input: DiagnosticoInput): string {
  const risco = calcChurnRisk(input.scoreTotal)
  const riscoLabel = risco === 'high' ? 'ALTO' : risco === 'medium' ? 'MÉDIO' : 'BAIXO'

  const flags = [
    ...input.agents.financeiro.flags,
    ...input.agents.proximidade.flags,
    ...input.agents.resultado.flags,
    ...input.agents.nps.flags,
  ]

  const pilares = [
    input.scoreFinanceiro  !== null ? `💰 Financeiro: ${input.scoreFinanceiro}/100` : '💰 Financeiro: sem dados',
    input.scoreProximidade !== null ? `💬 Proximidade: ${input.scoreProximidade}/100` : '💬 Proximidade: sem dados',
    input.scoreResultado   !== null ? `🎯 Resultado: ${input.scoreResultado}/100` : '🎯 Resultado: sem dados',
    input.scoreNps         !== null ? `⭐ NPS: ${input.scoreNps}/100` : '⭐ NPS: sem dados',
  ]

  const detalheFinanceiro = input.agents.financeiro.details
  const detalheProximidade = input.agents.proximidade.details
  const detalheNps = input.agents.nps.details

  const proximidadeSummary = (detalheProximidade.summary as string | undefined) ?? 'Dados não disponíveis'

  return `Você é um consultor de retenção de clientes para agências de marketing. Analise os dados abaixo e gere um diagnóstico honesto e acionável.

=== CLIENTE ===
Nome: ${input.clientName}
Segmento: ${input.segment ?? 'não informado'}
Serviço contratado: ${input.serviceType ?? 'não informado'}
Tempo como cliente: ${input.contractMonths} meses
Valor do contrato: ${input.mrrValue ? `R$ ${input.mrrValue.toLocaleString('pt-BR')}` : 'não informado'}

=== HEALTH SCORE ===
Score Total: ${input.scoreTotal}/100
Risco de Churn: ${riscoLabel}

Pilares:
${pilares.join('\n')}

Flags críticos: ${flags.length > 0 ? flags.join(', ') : 'nenhum'}

=== DETALHES FINANCEIROS ===
- Total de cobranças no período: ${(detalheFinanceiro.totalPayments as number | undefined) ?? 0}
- Cobranças recebidas: ${(detalheFinanceiro.received as number | undefined) ?? 0}
- Cobranças em atraso: ${(detalheFinanceiro.overdue as number | undefined) ?? 0}
- Chargebacks: ${(detalheFinanceiro.chargebacks as number | undefined) ?? 0}
- Valor em atraso: ${((detalheFinanceiro.totalOverdue as number | undefined) ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}

=== DETALHES DE COMUNICAÇÃO (WhatsApp) ===
${proximidadeSummary !== 'Dados não disponíveis'
  ? `- Total de mensagens: ${(detalheProximidade.totalMessages as number | undefined) ?? 0}
- Sentimento geral: ${(detalheProximidade.sentiment as string | undefined) ?? 'neutro'}
- Nível de engajamento: ${(detalheProximidade.engagementLevel as string | undefined) ?? 'médio'}
- Resumo da IA: ${proximidadeSummary}`
  : '- WhatsApp não conectado'}

=== DETALHES DE NPS/RESULTADO ===
- NPS médio (últimos 90 dias): ${(detalheNps.avgNps as number | undefined) ?? 'sem dados'}
- Último NPS: ${(detalheNps.lastNps as number | undefined) ?? 'sem dados'}
- Respostas no período: ${(detalheNps.responses as number | undefined) ?? 0}

Retorne SOMENTE um JSON válido no formato:
{
  "diagnosis": "texto do diagnóstico (3-4 parágrafos em português, tom profissional mas direto, foque nos problemas reais e no que está indo bem)",
  "actionPlan": ["ação 1", "ação 2", "ação 3", "ação 4", "ação 5"]
}

REGRAS:
1. O diagnóstico deve ser específico para este cliente, não genérico
2. Mencione os dados concretos (scores, valores, dias de atraso, etc.)
3. O plano de ação deve ter 3-5 ações práticas e priorizadas (mais urgente primeiro)
4. Cada ação deve ser uma frase de ação clara: comece com verbo (ex: "Ligar para...", "Negociar...", "Enviar...")
5. Não mencione termos técnicos como "flags" ou "score" no texto — use linguagem natural`
}

// ── Agente principal ──────────────────────────────────────────────

export async function runAgenteDiagnostico(input: DiagnosticoInput): Promise<DiagnosticoOutput> {
  const prompt = buildPrompt(input)

  const body = {
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200,
    temperature: 0.4,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.openaiKey}` },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`GPT-4o diagnóstico erro ${res.status}: ${JSON.stringify(errBody).slice(0, 300)}`)
  }

  const data    = await res.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'
  const parsed  = JSON.parse(content)

  const tokensUsed = data.usage?.total_tokens ?? 0

  return {
    diagnosis:  parsed.diagnosis  ?? 'Diagnóstico não disponível.',
    actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
    tokensUsed,
  }
}
