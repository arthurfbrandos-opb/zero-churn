/**
 * Orquestrador de Análise — Sprint 3, Task S3-14
 *
 * Executa todos os agentes em sequência para um cliente específico:
 *   1. Coleta dados das fontes (Asaas, Dom, WhatsApp, Formulários)
 *   2. Roda os 3 agentes em paralelo (Financeiro, NPS, Proximidade)
 *   3. Calcula o score total ponderado
 *   4. Gera diagnóstico e plano de ação com GPT-4o (se disponível)
 *   5. Persiste os resultados no banco (health_scores + action_items)
 *   6. Gera alertas por flags críticos
 *   7. Libera o lock de análise
 *
 * LOCK: usa campo analysis_running em health_scores para evitar
 *       análises duplicadas simultâneas.
 */

import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/supabase/encryption'
import { fetchPaymentsByCustomerFromDb } from './data-fetcher'
import { runAgenteFinanceiro } from './financeiro'
import { runAgenteNps } from './nps'
import { runAgenteProximidade } from './proximidade'
import { runAgenteDiagnostico } from './diagnostico'
import { getAgencyEvolutionConfig } from '@/lib/evolution/agency-config'
import { fetchGroupMessages, extractMessageText } from '@/lib/evolution/client'
import {
  calcWeightedScore,
  calcChurnRisk,
  type AnalysisResult,
  type AgentResult,
} from './types'

// ── Helpers ───────────────────────────────────────────────────────

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Custo estimado por token (GPT-4o input: ~$5/1M, output: ~$15/1M)
// Estimativa conservadora: $10/1M tokens médio ≈ R$ 0,055 por 1k tokens
function estimateCostBrl(tokens: number): number {
  return Math.round((tokens / 1000) * 0.055 * 100) / 100
}

// Mapeia flags para alertas
const FLAG_ALERTS: Record<string, { severity: 'high' | 'medium' | 'low'; message: (name: string) => string }> = {
  'chargeback':          { severity: 'high',   message: n => `⚠️ ${n}: Chargeback identificado nas cobranças` },
  'consecutive_overdue': { severity: 'high',   message: n => `⚠️ ${n}: 2 ou mais pagamentos consecutivos em atraso` },
  'long_overdue':        { severity: 'high',   message: n => `⚠️ ${n}: Pagamento em atraso há mais de 30 dias` },
  'cancellation_risk':   { severity: 'high',   message: n => `⚠️ ${n}: Palavras de cancelamento detectadas no WhatsApp` },
  'nps_consecutive_low': { severity: 'high',   message: n => `⚠️ ${n}: NPS baixo (≤6) em 2 respostas consecutivas` },
  'nps_detractor':       { severity: 'medium', message: n => `${n}: Último NPS indica detrator (≤6)` },
  'form_silence':        { severity: 'medium', message: n => `${n}: Detrator sem resposta recente no formulário` },
  'silence':             { severity: 'medium', message: n => `${n}: Poucas mensagens no WhatsApp — possível afastamento` },
  'no_form_response':    { severity: 'low',    message: n => `${n}: Sem resposta no formulário nos últimos 90 dias` },
}

// ── Orquestrador ──────────────────────────────────────────────────

export interface OrchestratorInput {
  clientId:    string
  agencyId:    string
  triggeredBy: 'scheduled' | 'manual'
}

export interface OrchestratorOutput {
  success:     boolean
  analysisId?: string
  result?:     AnalysisResult
  error?:      string
  skipped?:    boolean
  skipReason?: string
}

export async function runAnalysis(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const supabase = supabaseAdmin()
  const { clientId, agencyId, triggeredBy } = input
  const startedAt = new Date().toISOString()

  // ── 1. Cria log de execução (status: running) ─────────────────
  const { data: logRow } = await supabase
    .from('analysis_logs')
    .insert({
      agency_id:    agencyId,
      client_id:    clientId,
      triggered_by: triggeredBy,
      status:       'running',
      started_at:   startedAt,
    })
    .select('id')
    .single()

  const logId = logRow?.id

  // ── 2. Verifica se já está rodando (lock) ─────────────────────
  // Verifica se há um analysis_log em status 'running' criado < 5 min atrás
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: running } = await supabase
    .from('analysis_logs')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'running')
    .neq('id', logId ?? '')
    .gte('started_at', fiveMinAgo)
    .maybeSingle()

  if (running) {
    // Cancela o log que acabamos de criar
    if (logId) {
      await supabase.from('analysis_logs').update({ status: 'skipped', finished_at: new Date().toISOString() }).eq('id', logId)
    }
    return { success: false, skipped: true, skipReason: 'Análise já em andamento' }
  }

  // ── 3. Busca dados do cliente ─────────────────────────────────
  const { data: client } = await supabase
    .from('clients')
    .select(`
      id, name, nome_resumido, segment, contract_start,
      client_type, mrr_value, tcv_value, observations,
      whatsapp_group_id,
      client_integrations ( type, status, credentials_enc, credentials ),
      agencies ( id, name )
    `)
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .single()

  if (!client) {
    await supabase.from('analysis_logs').update({
      status: 'failed', error_message: 'Cliente não encontrado', finished_at: new Date().toISOString(),
    }).eq('id', logId ?? '')
    return { success: false, error: 'Cliente não encontrado' }
  }

  // Verifica período de observação (< 60 dias)
  const contractStart = client.contract_start
  if (contractStart) {
    const daysSinceStart = Math.floor((Date.now() - new Date(contractStart).getTime()) / 86400000)
    if (daysSinceStart < 60) {
      await supabase.from('analysis_logs').update({
        status: 'skipped',
        error_message: `Cliente em período de observação (${daysSinceStart} dias — mínimo 60)`,
        finished_at: new Date().toISOString(),
      }).eq('id', logId ?? '')
      return { success: false, skipped: true, skipReason: 'Cliente em período de observação (< 60 dias)' }
    }
  }

  const clientName   = client.nome_resumido ?? client.name
  const agencyName   = (client.agencies as unknown as { name: string } | null)?.name ?? 'Agência'
  const groupId      = client.whatsapp_group_id as string | null
  const contractStart2 = contractStart ?? new Date().toISOString().slice(0, 10)
  const contractMonths = Math.floor((Date.now() - new Date(contractStart2).getTime()) / 86400000 / 30)
  const mrrValue     = client.mrr_value as number | null ?? client.tcv_value as number | null

  const openaiKey    = process.env.OPENAI_API_KEY ?? null

  // ── 4. Busca dados das integrações ───────────────────────────

  // Asaas
  const asaasInteg = ((client.client_integrations as Array<Record<string, unknown>>) ?? [])
    .filter(i => i.type === 'asaas')

  // Dom
  const domInteg = ((client.client_integrations as Array<Record<string, unknown>>) ?? [])
    .filter(i => i.type === 'dom_pagamentos')

  // Formulários (últimos 90 dias)
  const cutoff90 = new Date(Date.now() - 90 * 86400000).toISOString()
  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('id, submitted_at, nps_score, score_resultado, comment')
    .eq('client_id', clientId)
    .gte('submitted_at', cutoff90)
    .order('submitted_at', { ascending: false })

  // ── 5. Coleta pagamentos do banco ────────────────────────────
  const { asaasPayments, domPayments } = await fetchPaymentsByCustomerFromDb(
    supabase, clientId, agencyId, asaasInteg, domInteg
  )

  const endDate   = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)

  // ── 6. Roda agentes em paralelo ───────────────────────────────
  const agentsLog: Record<string, AgentResult> = {}

  const [finResult, { resultado: resResult, nps: npsResult }] = await Promise.all([
    runAgenteFinanceiro({ clientId, asaasPayments, domPayments, startDate, endDate }),
    runAgenteNps({
      clientId,
      submissions: (submissions ?? []).map(s => ({
        id:             String(s.id),
        submittedAt:    String(s.submitted_at),
        npsScore:       Number(s.nps_score ?? 0),
        scoreResultado: Number(s.score_resultado ?? 0),
        comment:        s.comment ? String(s.comment) : null,
      })),
    }),
  ])

  agentsLog.financeiro = finResult
  agentsLog.resultado  = resResult
  agentsLog.nps        = npsResult

  // ── Proximidade: busca mensagens do banco (webhook) ou API live ──
  // WhatsApp é OPCIONAL: se não conectado, pilar retorna score null
  // e é excluído do cálculo ponderado automaticamente.
  let proxResult: AgentResult
  try {
    let messages: { content: string; senderName: string | null; timestamp: number; fromMe: boolean }[] = []

    if (groupId) {
      const cutoff = Math.floor(Date.now() / 1000) - 60 * 86400

      // 1. Tenta banco local (webhook já populou)
      const { data: dbMsgs } = await supabase
        .from('whatsapp_messages')
        .select('content, sender_name, timestamp_unix, from_me')
        .eq('group_id', groupId.includes('@g.us') ? groupId : `${groupId}@g.us`)
        .eq('agency_id', agencyId)
        .gte('timestamp_unix', cutoff)
        .order('timestamp_unix', { ascending: true })
        .limit(1000)

      if (dbMsgs && dbMsgs.length > 0) {
        messages = dbMsgs.map(m => ({
          content:    String(m.content),
          senderName: m.sender_name ? String(m.sender_name) : null,
          timestamp:  Number(m.timestamp_unix),
          fromMe:     Boolean(m.from_me),
        }))
      } else {
        // 2. Fallback: busca ao vivo na Evolution API
        const evolutionConfig = await getAgencyEvolutionConfig(supabase, agencyId)
        if (evolutionConfig) {
          const rawMsgs = await fetchGroupMessages(groupId, evolutionConfig, 60, 1000)
          messages = rawMsgs.flatMap(m => {
            const text = extractMessageText(m)
            if (!text?.trim()) return []
            return [{
              content:    text.trim(),
              senderName: m.pushName ?? null,
              timestamp:  m.messageTimestamp,
              fromMe:     m.key.fromMe,
            }]
          })
        }
      }
    }

    proxResult = await runAgenteProximidade({
      clientId,
      groupId,
      messages,   // passa as mensagens já coletadas
      days:       60,
      openaiKey:  openaiKey ?? undefined,
    })
  } catch (err) {
    console.error('[orchestrator] Proximidade exception:', err)
    proxResult = {
      agent:   'proximidade',
      score:   null,
      flags:   [],
      details: { error: String(err), reason: 'Erro inesperado no agente de proximidade' },
      status:  'error',
      error:   String(err),
    }
  }
  agentsLog.proximidade = proxResult

  // ── 7. Calcula score total ────────────────────────────────────
  const scoreFinanceiro  = finResult.score
  const scoreProximidade = proxResult.score
  const scoreResultado   = resResult.score
  const scoreNps         = npsResult.score

  const scoreTotal = calcWeightedScore({
    financeiro:  scoreFinanceiro,
    proximidade: scoreProximidade,
    resultado:   scoreResultado,
    nps:         scoreNps,
  })

  const churnRisk = calcChurnRisk(scoreTotal)

  // Todos os flags
  const allFlags = [
    ...finResult.flags,
    ...proxResult.flags,
    ...resResult.flags,
    ...npsResult.flags,
  ]

  // ── 8. Diagnóstico com GPT-4o (se OpenAI disponível) ─────────
  let diagnosis:    string | undefined
  let actionPlan:   string[] | undefined
  let tokensTotal   = 0

  // Conta tokens do agente proximidade
  tokensTotal += (proxResult.details.tokensEstimate as number | undefined) ?? 0

  if (openaiKey) {
    try {
      const diagResult = await runAgenteDiagnostico({
        clientName,
        agencyName,
        segment:        client.segment as string | null,
        serviceType:    null,  // TODO: campo no banco
        contractMonths,
        mrrValue,
        scoreFinanceiro,
        scoreProximidade,
        scoreResultado,
        scoreNps,
        scoreTotal,
        agents: {
          financeiro:  finResult,
          proximidade: proxResult,
          resultado:   resResult,
          nps:         npsResult,
        },
        openaiKey,
      })
      diagnosis  = diagResult.diagnosis
      actionPlan = diagResult.actionPlan
      tokensTotal += diagResult.tokensUsed
    } catch (err) {
      console.error('[orchestrator] Diagnóstico falhou:', err)
      diagnosis = 'Diagnóstico não disponível (erro na geração por IA).'
    }
  } else {
    diagnosis = `[Diagnóstico automático sem IA]\n\nHealth Score: ${scoreTotal}/100 (Risco ${churnRisk === 'high' ? 'Alto' : churnRisk === 'medium' ? 'Médio' : 'Baixo'}). Configure OPENAI_API_KEY para diagnósticos detalhados.`
  }

  const costBrl = estimateCostBrl(tokensTotal)

  // ── 9. Persiste health_score ──────────────────────────────────
  const { data: hsRow } = await supabase
    .from('health_scores')
    .insert({
      client_id:        clientId,
      agency_id:        agencyId,
      score_total:      scoreTotal,
      score_financeiro: scoreFinanceiro,
      score_proximidade: scoreProximidade,
      score_resultado:  scoreResultado,
      score_nps:        scoreNps,
      churn_risk:       churnRisk,
      diagnosis,
      flags:            allFlags,
      triggered_by:     triggeredBy,
      tokens_used:      tokensTotal,
      cost_brl:         costBrl,
    })
    .select('id')
    .single()

  const healthScoreId = hsRow?.id

  // ── 10. Persiste plano de ação ────────────────────────────────
  if (healthScoreId && actionPlan?.length) {
    await supabase.from('action_items').insert(
      actionPlan.map(text => ({
        health_score_id: healthScoreId,
        client_id:       clientId,
        agency_id:       agencyId,
        text,
      }))
    )
  }

  // ── 11. Gera alertas por flags ───────────────────────────────
  for (const flag of allFlags) {
    const alertDef = FLAG_ALERTS[flag]
    if (!alertDef) continue

    // Evita duplicar alertas: verifica se já existe um não lido do mesmo tipo
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('client_id', clientId)
      .eq('agency_id', agencyId)
      .eq('type', flag)
      .eq('is_read', false)
      .maybeSingle()

    if (!existing) {
      await supabase.from('alerts').insert({
        agency_id: agencyId,
        client_id: clientId,
        type:      flag,
        severity:  alertDef.severity,
        message:   alertDef.message(clientName),
      })
    }
  }

  // ── 12. Atualiza log ──────────────────────────────────────────
  await supabase.from('analysis_logs').update({
    status:         'completed',
    health_score_id: healthScoreId,
    agents_log:     agentsLog,
    tokens_used:    tokensTotal,
    cost_brl:       costBrl,
    finished_at:    new Date().toISOString(),
  }).eq('id', logId ?? '')

  return {
    success:    true,
    analysisId: healthScoreId,
    result: {
      clientId,
      agencyId,
      scoreFinanceiro,
      scoreProximidade,
      scoreResultado,
      scoreNps,
      scoreTotal,
      churnRisk,
      flags:     allFlags,
      agentsLog,
      diagnosis,
      actionPlan,
      tokensUsed: tokensTotal,
      costBrl,
    },
  }
}
