/**
 * GET /api/cron/monthly-analysis
 *
 * Vercel Cron Job — roda diariamente às 9h UTC.
 * Verifica se hoje é o DIA DA SEMANA de análise de cada agência
 * (campo analysis_day: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb)
 * e, se for, processa todos os clientes ativos dessa agência.
 *
 * FREQUÊNCIA: semanal — cada agência escolhe o dia da semana.
 * Os agentes usam janela de 60 dias como histórico, com ênfase
 * na semana mais recente (últimos 7 dias) no cálculo de score.
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
import { sendAnalysisCompleted, sendPaymentAlert } from '@/lib/email/resend'

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
  const today      = new Date()
  const dayOfWeek  = today.getDay()   // 0=Dom, 1=Seg, ..., 6=Sáb

  console.log(`[cron] weekly-analysis — dia da semana ${dayOfWeek} (${today.toISOString().slice(0, 10)})`)

  // ── 1. Busca agências cujo analysis_day é hoje (dia da semana) ─
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, analysis_day')
    .eq('analysis_day', dayOfWeek)

  if (!agencies?.length) {
    console.log(`[cron] Nenhuma agência com análise na ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dayOfWeek]}.`)
    return NextResponse.json({ processed: 0, message: 'Sem agências para analisar hoje' })
  }

  console.log(`[cron] ${agencies.length} agência(s) para analisar hoje (${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dayOfWeek]})`)

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

          // ── Alerta de inadimplência por e-mail ──────────────
          // Dispara se o agente financeiro levantou flags críticos
          if (agencyEmail && result.result?.flags) {
            const flags      = result.result.flags
            const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zero-churn.vercel.app'
            const clientUrl  = `${appUrl}/clientes/${client.id}`

            const isInad = flags.some(f =>
              ['chargeback', 'consecutive_overdue', 'long_overdue'].includes(f)
            )
            const isVencendo = !isInad && flags.some(f => f === 'overdue')

            if (isInad || isVencendo) {
              await sendPaymentAlert({
                to:         agencyEmail,
                agencyName: agency.name,
                clientName: client.name,
                status:     isInad ? 'inadimplente' : 'vencendo',
                clientUrl,
              }).catch(e => console.warn('[cron] payment alert email falhou:', e))
            }
          }
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
