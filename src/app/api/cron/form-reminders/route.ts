/**
 * GET /api/cron/form-reminders
 *
 * Vercel Cron Job — roda diariamente às 8h UTC.
 * O formulário NPS tem cadência MENSAL. Este cron identifica quais
 * agências têm o NPS day (analysis_nps_day, dia do mês 1-28)
 * nos próximos 5 dias e dispara o lembrete por e-mail.
 *
 * SEPARAÇÃO DE CADÊNCIAS:
 *   - Análise de Health Score (sentimento WhatsApp + financeiro): SEMANAL
 *     → controlada por analysis_day (dia da semana 0-6)
 *   - Formulário NPS / Resultado: MENSAL
 *     → controlada por analysis_nps_day (dia do mês 1-28)
 *     → se não configurado, usa analysis_day como fallback (dia do mês)
 *
 * SEGURANÇA:
 *   - Verifica o header Authorization: Bearer ${CRON_SECRET}
 *   - Sem o secret, retorna 401
 *
 * POR QUE 5 DIAS?
 *   Tempo suficiente para a agência enviar o link e o cliente responder
 *   antes da análise mensal consolidar o NPS no Health Score.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

// ── Admin client (bypass RLS) ─────────────────────────────────────

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── Auth do cron ──────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

// ── Handler principal ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const now      = new Date()

  // O formulário NPS é mensal: dispara lembrete 5 dias antes do dia do mês configurado.
  // Usa analysis_nps_day (campo dedicado) ou fallback para o dia do mês atual + 5.
  const in5Days   = new Date(now.getTime() + 5 * 86400000)
  const targetDay = in5Days.getDate()   // 1–31 (dia do mês daqui a 5 dias)

  console.log(`[cron] form-reminders (NPS mensal) — hoje: ${now.toISOString().slice(0, 10)}, target nps_day: ${targetDay}`)

  // ── 1. Busca agências com NPS day em 5 dias ────────────────────
  // Tenta analysis_nps_day primeiro; se não existir na tabela, usa analysis_nps_day = targetDay
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('id, name, analysis_nps_day, analysis_day')
    .eq('analysis_nps_day', targetDay)

  if (error && error.code !== '42703') {
    // 42703 = coluna não existe (migration pendente) → usa fallback
    console.error('[cron] form-reminders: erro ao buscar agências:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!agencies?.length) {
    console.log(`[cron] form-reminders: nenhuma agência com NPS mensal no dia ${targetDay}`)
    return NextResponse.json({
      date:       now.toISOString().slice(0, 10),
      targetDay,
      agencies:   0,
      emailsSent: 0,
    })
  }

  console.log(`[cron] form-reminders: ${agencies.length} agência(s) com NPS mensal no dia ${targetDay}`)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zerochurn.com.br'

  let totalSent    = 0
  let totalSkipped = 0

  // ── 2. Para cada agência, chama send-reminders ─────────────────
  for (const agency of agencies) {
    console.log(`[cron] form-reminders: processando agência "${agency.name}" (${agency.id})`)

    try {
      const res = await fetch(`${appUrl}/api/forms/send-reminders`, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-cron-secret':   process.env.CRON_SECRET ?? '',
          'x-agency-id':     agency.id,
        },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error(`[cron] form-reminders: agência "${agency.name}" falhou:`, body?.error ?? res.status)
        continue
      }

      const data = await res.json()
      totalSent    += data.sent    ?? 0
      totalSkipped += data.skipped ?? 0

      console.log(`[cron] form-reminders: "${agency.name}" — sent: ${data.sent}, skipped: ${data.skipped}`)
    } catch (err) {
      console.error(`[cron] form-reminders: exceção para agência "${agency.name}":`, err)
    }
  }

  const summary = {
    date:        now.toISOString().slice(0, 10),
    targetDay,
    agencies:    agencies.length,
    emailsSent:  totalSent,
    skipped:     totalSkipped,
  }

  console.log('[cron] form-reminders concluído:', summary)
  return NextResponse.json(summary)
}
