/**
 * GET /api/operacional
 *
 * Retorna dados do Painel Operacional:
 *   - Histórico de jobs mensais (analysis_logs agrupados por dia)
 *   - Custo de IA por mês (tokens + custo em R$)
 *   - Saúde das integrações por cliente
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: au } = await supabase
    .from('agency_users')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!au?.agency_id) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
  const agencyId = au.agency_id

  // ── 1. Histórico de jobs mensais (últimos 6 meses) ────────────
  // Agrupados por dia (cada job mensal roda 1x por mês)
  const { data: logs } = await supabase
    .from('analysis_logs')
    .select('id, status, started_at, finished_at, tokens_used, cost_brl, client_id, error_message, triggered_by')
    .eq('agency_id', agencyId)
    .eq('triggered_by', 'scheduled')
    .order('started_at', { ascending: false })
    .limit(200)

  // Agrupa por dia
  const jobsByDate = new Map<string, {
    date: string
    total: number
    success: number
    failed: number
    skipped: number
    tokensTotal: number
    costTotal: number
    startedAt: string
    finishedAt: string | null
    failures: string[]
  }>()

  for (const log of (logs ?? [])) {
    const date = log.started_at?.slice(0, 10) ?? 'unknown'
    if (!jobsByDate.has(date)) {
      jobsByDate.set(date, {
        date,
        total: 0, success: 0, failed: 0, skipped: 0,
        tokensTotal: 0, costTotal: 0,
        startedAt: log.started_at, finishedAt: log.finished_at,
        failures: [],
      })
    }
    const job = jobsByDate.get(date)!
    job.total++
    if (log.status === 'completed') job.success++
    else if (log.status === 'failed')    job.failed++
    else if (log.status === 'skipped')   job.skipped++
    job.tokensTotal += log.tokens_used ?? 0
    job.costTotal   += log.cost_brl ?? 0
    if (log.status === 'failed' && log.error_message) {
      job.failures.push(log.error_message.slice(0, 100))
    }
    if (log.finished_at && (!job.finishedAt || log.finished_at > job.finishedAt)) {
      job.finishedAt = log.finished_at
    }
  }

  const jobHistory = [...jobsByDate.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  // ── 2. Custo de IA por mês ────────────────────────────────────
  const { data: allLogs } = await supabase
    .from('analysis_logs')
    .select('started_at, tokens_used, cost_brl')
    .eq('agency_id', agencyId)
    .eq('status', 'completed')
    .gte('started_at', new Date(Date.now() - 180 * 86400000).toISOString())

  const costByMonth = new Map<string, { tokens: number; cost: number }>()
  for (const log of (allLogs ?? [])) {
    const month = log.started_at?.slice(0, 7) ?? 'unknown'  // "2026-02"
    if (!costByMonth.has(month)) costByMonth.set(month, { tokens: 0, cost: 0 })
    const entry = costByMonth.get(month)!
    entry.tokens += log.tokens_used ?? 0
    entry.cost   += log.cost_brl ?? 0
  }

  const aiCost = [...costByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: new Date(month + '-15').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      tokens: data.tokens,
      cost:   Math.round(data.cost * 100) / 100,
    }))

  // ── 3. Saúde das integrações por cliente ──────────────────────
  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id, name, nome_resumido,
      client_integrations ( type, status, last_sync_at )
    `)
    .eq('agency_id', agencyId)
    .eq('status', 'active')
    .order('name')

  const integHealth = (clients ?? []).map(c => ({
    clientId:   c.id,
    clientName: c.nome_resumido ?? c.name,
    integrations: ((c.client_integrations as Array<Record<string, unknown>>) ?? []).map(i => ({
      type:       i.type,
      status:     i.status,
      lastSyncAt: i.last_sync_at,
    })),
  }))

  // ── 4. Estatísticas gerais ────────────────────────────────────
  const { data: agencyData } = await supabase
    .from('agencies')
    .select('analysis_day')
    .eq('id', agencyId)
    .maybeSingle()

  // analysis_day agora é dia da semana: 0=Dom, 1=Seg, ..., 6=Sáb
  const analysisDay   = agencyData?.analysis_day ?? 1  // padrão: segunda-feira
  const today         = new Date()
  const todayWeekday  = today.getDay()
  let   daysUntilNext = (analysisDay - todayWeekday + 7) % 7
  if (daysUntilNext === 0) daysUntilNext = 7  // se hoje é o dia, próxima é daqui a 7 dias
  const nextAnalysis  = new Date(today.getTime() + daysUntilNext * 86400000)

  return NextResponse.json({
    jobHistory,
    aiCost,
    integHealth,
    nextAnalysisDate: nextAnalysis.toISOString().slice(0, 10),
    analysisDay,
  })
}
