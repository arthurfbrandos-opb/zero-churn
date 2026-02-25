import { toErrorMsg } from '@/lib/utils'
/**
 * Agente Proximidade — Sprint 3, Tasks S3-07, S3-08, S3-09, S3-10
 *
 * Analisa as mensagens do grupo de WhatsApp do cliente para determinar
 * o nível de engajamento e o sentimento da comunicação.
 *
 * PIPELINE:
 *   1. Coleta mensagens via Evolution API (fetchGroupMessages)
 *   2. Divide em blocos semanais (batching)
 *   3. Sumariza cada bloco com GPT-3.5-turbo (barato)
 *   4. Analisa os resumos com GPT-4o (mais inteligente) → score + sentimento
 *
 * REGRAS DE SCORING:
 *   - Base: 70 (neutro)
 *   - Sentimento positivo: +30 → 100
 *   - Sentimento negativo: -30 → 40
 *   - Silêncio (< 5 msgs em 60 dias): score 30, flag 'silence'
 *   - Sem WhatsApp conectado: score null, flag 'no_whatsapp_data'
 *
 * FLAGS CRÍTICOS:
 *   - 'silence'            — < 5 mensagens em 60 dias
 *   - 'cancellation_risk'  — palavras-chave de cancelamento detectadas
 *   - 'negative_sentiment' — sentimento geral negativo
 *   - 'no_whatsapp_data'   — WhatsApp não conectado
 */

import type { AgentResult } from './types'

// ── Tipos ─────────────────────────────────────────────────────────

interface ProximidadeInput {
  clientId:   string
  groupId:    string | null    // null = sem WhatsApp conectado
  messages?:  {               // mensagens pré-coletadas pelo orchestrator
    content:    string
    senderName: string | null
    senderJid?: string | null  // JID do remetente (para filtro de time)
    timestamp:  number
    fromMe:     boolean
  }[]
  teamJids?:  Set<string>      // JIDs dos membros do time da agência
  days?:      number           // padrão: 60
  openaiKey?: string           // se não fornecido → score heurístico
}

// Palavras-chave de alerta de cancelamento (PT-BR)
const CANCEL_KEYWORDS = [
  'cancelar', 'cancelamento', 'rescindir', 'rescisão', 'encerrar contrato',
  'não quero mais', 'quero parar', 'insatisfeito', 'descontente', 'decepcionado',
  'péssimo', 'horrível', 'terrível', 'abandonar', 'mudar de agência',
]

// ── Batching semanal ──────────────────────────────────────────────

interface WeeklyBatch {
  weekLabel:  string
  messages:   { sender: string; text: string; ts: number; isTeam?: boolean }[]
}

function buildWeeklyBatches(
  messages: { sender: string; text: string; ts: number; isTeam?: boolean }[],
): WeeklyBatch[] {
  const byWeek = new Map<string, typeof messages>()

  for (const msg of messages) {
    const date   = new Date(msg.ts * 1000)
    const year   = date.getFullYear()
    // Número da semana ISO
    const startOfYear = new Date(year, 0, 1)
    const week   = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    const key    = `${year}-W${String(week).padStart(2, '0')}`
    if (!byWeek.has(key)) byWeek.set(key, [])
    byWeek.get(key)!.push(msg)
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, msgs]) => ({ weekLabel: key, messages: msgs }))
}

// ── Sumarização semanal com GPT-3.5 ──────────────────────────────

async function summarizeWeek(
  weekLabel: string,
  messages:  WeeklyBatch['messages'],
  apiKey:    string,
  hasTeamInfo: boolean,
): Promise<string> {
  const content = messages
    .slice(0, 50)  // no máximo 50 msgs por semana
    .map(m => {
      const tag = hasTeamInfo ? (m.isTeam ? '[EQUIPE]' : '[CLIENTE]') + ' ' : ''
      return `${tag}[${m.sender}]: ${m.text.slice(0, 200)}`
    })
    .join('\n')

  const systemPrompt = hasTeamInfo
    ? 'Você é um analista de relacionamento entre uma agência de marketing e seu cliente. As mensagens estão marcadas com [EQUIPE] (time da agência) ou [CLIENTE] (time do cliente). Foque sua análise nas mensagens do CLIENTE — o tom, engajamento e satisfação deles é o que importa. Escreva um parágrafo conciso (máx 100 palavras) descrevendo: o nível de engajamento DO CLIENTE, o tom da comunicação DO CLIENTE, temas principais e sinais preocupantes. Responda APENAS o parágrafo.'
    : 'Você é um analista de relacionamento entre uma agência de marketing e seu cliente. Analise o trecho de conversas de WhatsApp e escreva um parágrafo conciso (máx 100 palavras) descrevendo: o nível de engajamento, o tom geral da comunicação, temas principais discutidos e qualquer sinal preocupante. Responda APENAS o parágrafo, sem introdução.'

  const body = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Semana ${weekLabel}:\n\n${content}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.3,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body:    JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`GPT-3.5 erro ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

// ── Análise final com GPT-4o ──────────────────────────────────────

interface ProximidadeGptOutput {
  score:          number        // 0–100
  sentiment:      'positive' | 'neutral' | 'negative'
  engagementLevel: 'high' | 'medium' | 'low'
  flags:          string[]      // ex: ['cancellation_risk', 'silence']
  summary:        string        // 2–3 frases para o diagnóstico
}

async function analyzeWithGpt4o(
  weeklyResumos: string[],
  apiKey: string,
  totalMessages: number,
  clientMessages?: number,
): Promise<ProximidadeGptOutput> {
  // Rotula os resumos dando destaque especial à semana mais recente
  const totalWeeks = weeklyResumos.length
  const resumoText = weeklyResumos
    .map((r, i) => {
      const isLast = i === totalWeeks - 1
      const label  = isLast
        ? `[SEMANA MAIS RECENTE — peso maior na avaliação] Semana ${i + 1}`
        : `Semana ${i + 1} (histórico)`
      return `${label}:\n${r}`
    })
    .join('\n\n')

  const body = {
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em análise de relacionamento entre agências de marketing e seus clientes.

Você receberá resumos semanais de conversas de WhatsApp cobrindo os últimos 60 dias.
A análise é executada SEMANALMENTE — por isso a semana mais recente (marcada como [SEMANA MAIS RECENTE]) deve ter peso maior na sua avaliação do estado atual do relacionamento. As semanas anteriores fornecem contexto histórico e tendências.

Retorne um JSON com:
{
  "score": número de 0 a 100 representando a saúde da comunicação ATUAL (baseado principalmente na semana mais recente, com contexto das anteriores),
  "sentiment": "positive" | "neutral" | "negative" (sentimento predominante na semana mais recente),
  "engagementLevel": "high" | "medium" | "low",
  "flags": array de strings com flags preocupantes (ex: "cancellation_risk", "negative_sentiment", "silence"),
  "summary": string com 2-3 frases — a primeira frase deve descrever o estado DESTA SEMANA, as demais a tendência histórica
}

CRITÉRIOS DE SCORE (baseado principalmente na semana mais recente):
- 80-100: Comunicação frequente e positiva, cliente engajado esta semana
- 60-79: Comunicação regular, tom neutro a positivo esta semana
- 40-59: Comunicação escassa ou tom neutro esta semana, sem grandes sinais negativos
- 20-39: Comunicação rara ou tom negativo detectado esta semana
- 0-19: Silêncio quase total esta semana ou sinais fortes de cancelamento`,
      },
      {
        role: 'user',
        content: `Total de mensagens nos últimos 60 dias: ${totalMessages}${clientMessages !== undefined ? ` (${clientMessages} do cliente)` : ''}\n\nResumos por semana (do mais antigo ao mais recente):\n\n${resumoText}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.2,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`GPT-4o erro ${res.status}: ${JSON.stringify(errBody).slice(0, 200)}`)
  }

  const data = await res.json()
  const raw  = data.choices?.[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as ProximidadeGptOutput
}

// ── Agente principal ──────────────────────────────────────────────

export async function runAgenteProximidade(input: ProximidadeInput): Promise<AgentResult> {
  const startMs = Date.now()
  const days    = input.days ?? 60

  // Sem WhatsApp conectado
  if (!input.groupId) {
    return {
      agent:      'proximidade',
      score:      null,
      flags:      ['no_whatsapp_data'],
      details:    { reason: 'WhatsApp não conectado para este cliente' },
      status:     'skipped',
      durationMs: Date.now() - startMs,
    }
  }

  try {
    // ── 1. Normaliza mensagens (já coletadas pelo orchestrator) ───
    const teamJids   = input.teamJids ?? new Set<string>()
    const hasTeamInfo = teamJids.size > 0

    const messages = (input.messages ?? [])
      .map(m => {
        const isTeam = hasTeamInfo && (
          m.fromMe ||
          (m.senderJid ? teamJids.has(m.senderJid) : false)
        )
        return {
          sender: m.senderName ?? 'Desconhecido',
          text:   m.content,
          ts:     m.timestamp,
          isTeam,
        }
      })
      .filter(m => m.text.trim().length > 0)

    const clientMessages = hasTeamInfo ? messages.filter(m => !m.isTeam) : messages
    const clientMsgCount = clientMessages.length
    const totalMsgCount  = messages.length

    // Silêncio: baseado nas mensagens do CLIENTE (não total)
    if (clientMsgCount < 5) {
      return {
        agent:  'proximidade',
        score:  30,
        flags:  ['silence'],
        details: {
          totalMessages:  totalMsgCount,
          clientMessages: hasTeamInfo ? clientMsgCount : undefined,
          period:         `${days} dias`,
          reason:         hasTeamInfo
            ? `Menos de 5 mensagens do cliente no período (${clientMsgCount} de ${totalMsgCount} total) — silêncio detectado`
            : 'Menos de 5 mensagens no período — silêncio detectado',
        },
        status:     'success',
        durationMs: Date.now() - startMs,
      }
    }

    // Detecção rápida de palavras-chave de cancelamento (foca nas msgs do cliente)
    const textForCancel = clientMessages.map(m => m.text.toLowerCase()).join(' ')
    const hasCancelKw = CANCEL_KEYWORDS.some(kw => textForCancel.includes(kw))

    // ── 2. Sem OpenAI configurado → score heurístico ─────────────
    if (!input.openaiKey) {
      const baseScore = Math.min(100, 50 + clientMsgCount / 2)
      const score     = hasCancelKw ? Math.max(20, baseScore - 30) : Math.round(baseScore)
      const flags     = hasCancelKw ? ['cancellation_risk'] : []

      return {
        agent:  'proximidade',
        score,
        flags,
        details: {
          totalMessages:    totalMsgCount,
          clientMessages:   hasTeamInfo ? clientMsgCount : undefined,
          period:           `${days} dias`,
          hasCancelKeywords: hasCancelKw,
          mode:             'heuristic (no OpenAI key)',
        },
        status:     'success',
        durationMs: Date.now() - startMs,
      }
    }

    // ── 3. Batching semanal (GPT-3.5) ────────────────────────────
    const batches      = buildWeeklyBatches(messages)
    const weeklyResumos: string[] = []
    let tokensEstimate = 0

    for (const batch of batches) {
      if (batch.messages.length === 0) continue
      const resumo = await summarizeWeek(batch.weekLabel, batch.messages, input.openaiKey, hasTeamInfo)
      weeklyResumos.push(resumo)
      tokensEstimate += 300  // estimativa por batch
    }

    if (weeklyResumos.length === 0) {
      return {
        agent:  'proximidade',
        score:  50,
        flags:  [],
        details: { totalMessages: totalMsgCount, clientMessages: hasTeamInfo ? clientMsgCount : undefined, reason: 'Sem resumos gerados' },
        status: 'success',
        durationMs: Date.now() - startMs,
      }
    }

    // ── 4. Análise final GPT-4o ───────────────────────────────────
    const gptResult = await analyzeWithGpt4o(
      weeklyResumos, input.openaiKey, totalMsgCount,
      hasTeamInfo ? clientMsgCount : undefined,
    )
    tokensEstimate += 500

    // Merge de flags: adiciona cancellation_risk se palavras-chave detectadas
    const finalFlags = [...(gptResult.flags ?? [])]
    if (hasCancelKw && !finalFlags.includes('cancellation_risk')) {
      finalFlags.push('cancellation_risk')
    }

    return {
      agent:  'proximidade',
      score:  gptResult.score,
      flags:  finalFlags,
      details: {
        totalMessages:   totalMsgCount,
        clientMessages:  hasTeamInfo ? clientMsgCount : undefined,
        period:          `${days} dias`,
        sentiment:       gptResult.sentiment,
        engagementLevel: gptResult.engagementLevel,
        summary:         gptResult.summary,
        weeklyBatches:   batches.length,
        tokensEstimate,
      },
      status:     'success',
      durationMs: Date.now() - startMs,
    }
  } catch (err) {
    const msg = toErrorMsg(err)
    return {
      agent:      'proximidade',
      score:      null,
      flags:      [],
      details:    { error: msg },
      status:     'error',
      error:      msg,
      durationMs: Date.now() - startMs,
    }
  }
}
