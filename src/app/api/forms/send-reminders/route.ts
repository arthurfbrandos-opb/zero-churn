/**
 * POST /api/forms/send-reminders
 *
 * Envia e-mail de lembrete para a agência enviar formulários
 * a clientes que ainda não foram enviados neste ciclo
 * (ou o último token tem mais de 25 dias e não foi respondido).
 *
 * Chamado pelo Vercel Cron 5 dias antes do dia de análise da agência.
 * Pode também ser chamado manualmente via painel operacional.
 *
 * Retorna: { sent: number, skipped: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendFormReminder } from '@/lib/email/resend'

// Autoriza chamada via cron (header secret) ou sessão autenticada
function isCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('x-cron-secret') === secret
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Valida acesso: cron ou usuário autenticado
  const authed = isCron(req)
  if (!authed) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Busca a agência (para cron, usa o agency_id do header se fornecido;
  // para usuário autenticado, usa a agência do usuário)
  let agencyId: string
  let agencyEmail: string
  let agencyName: string
  let analysisDay: number

  if (authed) {
    const headerAgencyId = req.headers.get('x-agency-id')
    if (!headerAgencyId) {
      return NextResponse.json({ error: 'x-agency-id header obrigatório para cron' }, { status: 400 })
    }
    agencyId = headerAgencyId
    const { data: agency } = await supabase
      .from('agencies')
      .select('id, name, analysis_day')
      .eq('id', agencyId)
      .maybeSingle()
    if (!agency) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    // Busca o email do admin da agência
    const { data: adminUser } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', agencyId)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()
    if (!adminUser) return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })

    const { data: authUser } = await supabase.auth.admin.getUserById(adminUser.user_id)
    agencyEmail  = authUser.user?.email ?? ''
    agencyName   = agency.name
    analysisDay  = agency.analysis_day ?? 5
  } else {
    // Usuário autenticado
    const { data: { user } } = await supabase.auth.getUser()
    const { data: au } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user!.id)
      .maybeSingle()
    if (!au?.agency_id) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    agencyId = au.agency_id
    agencyEmail = user!.email ?? ''

    const { data: agency } = await supabase
      .from('agencies')
      .select('name, analysis_day')
      .eq('id', agencyId)
      .maybeSingle()
    agencyName  = agency?.name ?? 'Sua agência'
    analysisDay = agency?.analysis_day ?? 5
  }

  if (!agencyEmail) {
    return NextResponse.json({ error: 'E-mail da agência não encontrado' }, { status: 422 })
  }

  // Calcula a data do próximo envio mensal de NPS
  // analysisDay = dia do mês (1-28) configurado pela agência
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()

  let nextAnalysis = new Date(year, month, analysisDay)
  if (nextAnalysis <= now) {
    // Já passou do dia neste mês → próximo mês
    nextAnalysis = new Date(year, month + 1, analysisDay)
  }

  const daysLeft        = Math.ceil((nextAnalysis.getTime() - now.getTime()) / 86400000)
  const analysisDateStr = nextAnalysis.toLocaleDateString('pt-BR')

  // Busca clientes ativos sem formulário respondido nos últimos 30 dias
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, nome_resumido')
    .eq('agency_id', agencyId)
    .eq('status', 'active')

  if (!clients?.length) {
    return NextResponse.json({ sent: 0, skipped: 0, reason: 'Sem clientes ativos' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zero-churn-git-main-arthurfbrandos-opbs-projects.vercel.app'

  let sent = 0
  let skipped = 0

  for (const client of clients) {
    const clientId   = client.id
    const clientName = client.nome_resumido ?? client.name

    // Verifica se já tem formulário respondido nos últimos 30 dias
    const cutoff30 = new Date(now.getTime() - 30 * 86400000).toISOString()
    const { data: recentForm } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('client_id', clientId)
      .gte('submitted_at', cutoff30)
      .limit(1)
      .maybeSingle()

    if (recentForm) {
      skipped++
      continue  // Já respondeu recentemente — não precisa de lembrete
    }

    // Busca o token pendente mais recente (se houver)
    const { data: pendingToken } = await supabase
      .from('form_tokens')
      .select('token')
      .eq('client_id', clientId)
      .is('responded_at', null)
      .gte('expires_at', now.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const formUrl = pendingToken
      ? `${appUrl}/f/${pendingToken.token}`
      : undefined

    const result = await sendFormReminder({
      to:           agencyEmail,
      agencyName,
      clientName,
      analysisDate: analysisDateStr,
      daysLeft,
      formUrl,
    })

    if (result.ok) sent++
    else skipped++
  }

  return NextResponse.json({ sent, skipped, analysisDate: analysisDateStr, daysLeft })
}
