/**
 * POST /api/forms/check-nonresponse
 *
 * Verifica form_tokens pendentes e cria alertas de não-resposta
 * para clientes que não responderam após 7 ou 15 dias.
 *
 * Idempotente: não cria alertas duplicados (verifica se já existe
 * alerta do mesmo tipo para o mesmo token).
 *
 * Chamado pelo dashboard no carregamento e opcionalmente pelo
 * cron mensal no Sprint 4.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: au } = await supabase
    .from('agency_users')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!au?.agency_id) {
    return NextResponse.json({ checked: 0, created: 0 })
  }

  const agencyId = au.agency_id
  const now = new Date()

  // Busca tokens pendentes desta agência — enviados há pelo menos 7 dias, não respondidos
  const cutoff7  = new Date(now.getTime() - 7  * 86400000).toISOString()
  const cutoff15 = new Date(now.getTime() - 15 * 86400000).toISOString()

  const { data: tokens } = await supabase
    .from('form_tokens')
    .select('id, client_id, sent_at, expires_at, responded_at, clients(name, nome_resumido)')
    .eq('agency_id', agencyId)
    .is('responded_at', null)
    .lte('sent_at', cutoff7)       // enviado há 7+ dias
    .order('sent_at', { ascending: true })

  if (!tokens?.length) {
    return NextResponse.json({ checked: 0, created: 0 })
  }

  // Busca alertas de não-resposta já existentes para evitar duplicatas
  const { data: existingAlerts } = await supabase
    .from('alerts')
    .select('type, client_id, message')
    .eq('agency_id', agencyId)
    .in('type', ['form_no_response_7d', 'form_no_response_15d'])

  const existingKeys = new Set(
    (existingAlerts ?? []).map(a => `${a.type}:${a.client_id}`)
  )

  let created = 0

  for (const token of tokens) {
    const clientId   = token.client_id
    const sentAt     = new Date(token.sent_at!)
    const daysAgo    = Math.floor((now.getTime() - sentAt.getTime()) / 86400000)

    // Pega nome do cliente
    const clientRaw = token.clients as unknown as { name: string; nome_resumido: string | null } | { name: string; nome_resumido: string | null }[] | null
    const clientData = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw
    const clientName = clientData?.nome_resumido ?? clientData?.name ?? 'Cliente'

    // Alerta de 15 dias (prioridade: cria se não existir)
    if (daysAgo >= 15 && !existingKeys.has(`form_no_response_15d:${clientId}`)) {
      await supabase.from('alerts').insert({
        agency_id: agencyId,
        client_id: clientId,
        type:      'form_no_response_15d',
        severity:  'high',
        message:   `${clientName} não respondeu o formulário de satisfação há ${daysAgo} dias. Considere entrar em contato.`,
      })
      existingKeys.add(`form_no_response_15d:${clientId}`)
      created++
    }
    // Alerta de 7 dias (só cria se não tiver o de 15d)
    else if (
      daysAgo >= 7 && daysAgo < 15 &&
      !existingKeys.has(`form_no_response_7d:${clientId}`) &&
      !existingKeys.has(`form_no_response_15d:${clientId}`)
    ) {
      await supabase.from('alerts').insert({
        agency_id: agencyId,
        client_id: clientId,
        type:      'form_no_response_7d',
        severity:  'medium',
        message:   `${clientName} ainda não respondeu o formulário enviado há ${daysAgo} dias.`,
      })
      existingKeys.add(`form_no_response_7d:${clientId}`)
      created++
    }
  }

  return NextResponse.json({ checked: tokens.length, created })
}
