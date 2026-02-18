import { toErrorMsg } from '@/lib/utils'
/**
 * POST /api/analysis/[clientId]
 *
 * Dispara a análise completa de um cliente.
 * Retorna imediatamente com o resultado (ou erro) do orquestrador.
 *
 * Para análises longas (> 60s), considerar usar Supabase Edge Functions.
 * Por ora, a análise roda na própria API route do Vercel (max 60s no plano Pro).
 *
 * GET /api/analysis/[clientId]
 * Retorna o histórico de análises (health_scores) do cliente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAnalysis } from '@/lib/agents/orchestrator'

// ── GET — histórico de análises ───────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('health_scores')
    .select(`
      id, score_total, score_financeiro, score_proximidade,
      score_resultado, score_nps, churn_risk, diagnosis,
      flags, triggered_by, tokens_used, cost_brl, analyzed_at,
      action_items ( id, text, is_done, done_at )
    `)
    .eq('client_id', clientId)
    .order('analyzed_at', { ascending: false })
    .limit(12)

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }

  return NextResponse.json({ analyses: data ?? [] })
}

// ── POST — dispara nova análise ───────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Busca agency_id
  const { data: au } = await supabase
    .from('agency_users')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!au?.agency_id) {
    return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
  }

  try {
    const result = await runAnalysis({
      clientId:    clientId,
      agencyId:    au.agency_id,
      triggeredBy: 'manual',
    })

    if (result.skipped) {
      return NextResponse.json({
        skipped:    true,
        skipReason: result.skipReason,
      }, { status: 200 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Análise falhou' }, { status: 500 })
    }

    return NextResponse.json({
      success:    true,
      analysisId: result.analysisId,
      result:     result.result,
    })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[analysis/POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
