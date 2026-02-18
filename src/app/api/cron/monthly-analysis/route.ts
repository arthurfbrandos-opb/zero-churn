/**
 * GET /api/cron/monthly-analysis
 *
 * Vercel Cron Job — roda diariamente às 9h UTC.
 * Verifica se hoje é o dia de análise de cada agência e,
 * se for, processa todos os clientes ativos dessa agência.
 *
 * SEGURANÇA:
 *   - Verifica o header Authorization: Bearer ${CRON_SECRET}
 *   - Sem o secret, retorna 401
 *
 * PROCESSAMENTO:
 *   - Sequencial: 1 cliente por vez (evita sobrecarga de APIs externas)
 *   - Clientes em período de observação são pulados (< 60 dias)
 *   - Falhas em clientes individuais não interrompem o job
 *
 * LOG:
 *   - Registrado em analysis_logs por cliente
 *   - E-mail ao final do job: "X de Y clientes analisados"
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runAnalysis } from '@/lib/agents/orchestrator'
import { sendAnalysisCompleted } from '@/lib/email/resend'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Verifica auth do cron (Vercel injeta CRON_SECRET automaticamente)
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const today    = new Date()
  const dayOfMonth = today.getDate()  // 1–31

  console.log(`[cron] monthly-analysis — dia ${dayOfMonth} de ${today.toISOString().slice(0, 7)}`)

  // ── 1. Busca agências cujo analysis_day é hoje ─────────────────
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, analysis_day')
    .eq('analysis_day', dayOfMonth)

  if (!agencies?.length) {
    console.log('[cron] Nenhuma agência com análise hoje.')
    return NextResponse.json({ processed: 0, message: 'Sem agências para analisar hoje' })
  }

  console.log(`[cron] ${agencies.length} agência(s) para analisar hoje`)

  let totalClients  = 0
  let totalSuccess  = 0
  let totalFailed   = 0
  let totalSkipped  = 0

  // ── 2. Para cada agência, processa todos os clientes ativos ────
  for (const agency of agencies) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('agency_id', agency.id)
      .eq('status', 'active')

    if (!clients?.length) continue

    totalClients += clients.length
    console.log(`[cron] Agência "${agency.name}": ${clients.length} clientes`)

    // Busca e-mail do admin da agência
    const { data: adminUser } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', agency.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()

    let agencyEmail = ''
    if (adminUser) {
      const { data: authUser } = await supabase.auth.admin.getUserById(adminUser.user_id)
      agencyEmail = authUser.user?.email ?? ''
    }

    let agencySuccess = 0
    let agencyFailed  = 0

    // ── 3. Processa 1 cliente por vez (sequencial) ──────────────
    for (const client of clients) {
      console.log(`[cron]   → Analisando: ${client.name} (${client.id})`)

      try {
        const result = await runAnalysis({
          clientId:    client.id,
          agencyId:    agency.id,
          triggeredBy: 'scheduled',
        })

        if (result.skipped) {
          totalSkipped++
          console.log(`[cron]   ⚠️ Pulado: ${result.skipReason}`)
        } else if (result.success) {
          agencySuccess++
          totalSuccess++
          console.log(`[cron]   ✅ Score: ${result.result?.scoreTotal}`)
        } else {
          agencyFailed++
          totalFailed++
          console.error(`[cron]   ❌ Falhou: ${result.error}`)
        }
      } catch (err) {
        agencyFailed++
        totalFailed++
        console.error(`[cron]   ❌ Exceção: ${err instanceof Error ? err.message : String(err)}`)
      }

      // Pequena pausa entre clientes para não sobrecarregar APIs externas
      await new Promise(r => setTimeout(r, 2000))
    }

    // ── 4. Envia e-mail de conclusão para a agência ─────────────
    if (agencyEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zero-churn.vercel.app'
      await sendAnalysisCompleted({
        to:           agencyEmail,
        agencyName:   agency.name,
        total:        clients.length,
        success:      agencySuccess,
        failed:       agencyFailed,
        dashboardUrl: `${appUrl}/dashboard`,
      })
    }

    console.log(`[cron] Agência "${agency.name}" concluída: ${agencySuccess} ✅ ${agencyFailed} ❌`)
  }

  const summary = {
    date:         today.toISOString().slice(0, 10),
    agencies:     agencies.length,
    totalClients,
    success:      totalSuccess,
    failed:       totalFailed,
    skipped:      totalSkipped,
  }

  console.log('[cron] Concluído:', summary)
  return NextResponse.json(summary)
}
