import { toErrorMsg } from '@/lib/utils'
/**
 * GET /api/cron/check-integrations
 *
 * Vercel Cron Job — roda toda segunda-feira às 8h UTC.
 * Varre todas as integrações ativas de todos os clientes e cria
 * alertas para as que estão com problema:
 *
 *   - Asaas: testa se o customer_id ainda existe na API
 *   - Dom Pagamentos: testa se o token da agência ainda responde
 *   - WhatsApp: verifica se o campo status === 'connected' e
 *               se tem mais de 30 dias sem sincronização
 *
 * SEGURANÇA:
 *   - Verifica o header Authorization: Bearer ${CRON_SECRET}
 *   - Sem o secret, retorna 401
 *
 * IDEMPOTENTE:
 *   - Não cria alertas duplicados do mesmo tipo para o mesmo cliente
 *     (verifica alertas criados nos últimos 7 dias)
 *
 * LOG:
 *   - Retorna resumo JSON com totais por status
 */
import { NextRequest, NextResponse }                         from 'next/server'
import { createClient }                                      from '@supabase/supabase-js'
import { decrypt }                                           from '@/lib/supabase/encryption'
import { sendIntegrationAlert }                              from '@/lib/email/resend'

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

// ── Helpers de teste por tipo ─────────────────────────────────────

/** Testa se a chave Asaas da agência ainda é válida */
async function testAsaasKey(apiKey: string): Promise<{ ok: boolean; msg?: string }> {
  try {
    const res = await fetch('https://api.asaas.com/v3/customers?limit=1', {
      headers: { 'access_token': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, msg: body?.errors?.[0]?.description ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, msg: toErrorMsg(e) }
  }
}

/** Testa se o token Dom Pagamentos da agência ainda é válido */
async function testDomToken(token: string, env: string): Promise<{ ok: boolean; msg?: string }> {
  const base = env === 'sandbox'
    ? 'https://hml-apiv3.dompagamentos.com.br/checkout/sandbox'
    : 'https://apiv3.dompagamentos.com.br/checkout/production'
  try {
    const res = await fetch(`${base}/transactions?per_page=1`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, msg: body?.message ?? body?.error ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, msg: toErrorMsg(e) }
  }
}

// ── Handler principal ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const now      = new Date()

  console.log(`[cron] check-integrations — ${now.toISOString()}`)

  // ── 1. Busca integrações de agência (Asaas e Dom) ─────────────
  // Testa a chave UMA VEZ por agência (não por cliente, para economizar requests)
  const { data: agencyIntegrations } = await supabase
    .from('agency_integrations')
    .select('id, agency_id, type, encrypted_key, status')
    .in('type', ['asaas', 'dom_pagamentos'])

  // Mapa: agency_id+type → resultado do teste
  const agencyKeyStatus = new Map<string, { ok: boolean; msg?: string }>()

  for (const integ of (agencyIntegrations ?? [])) {
    const mapKey = `${integ.agency_id}:${integ.type}`
    if (agencyKeyStatus.has(mapKey)) continue  // já testou esta agência+tipo

    if (!integ.encrypted_key) {
      agencyKeyStatus.set(mapKey, { ok: false, msg: 'Sem chave configurada' })
      continue
    }

    try {
      const creds = await decrypt<Record<string, string>>(integ.encrypted_key)

      if (integ.type === 'asaas') {
        const result = await testAsaasKey(creds.api_key)
        agencyKeyStatus.set(mapKey, result)
      } else if (integ.type === 'dom_pagamentos') {
        const result = await testDomToken(creds.token, creds.environment ?? 'production')
        agencyKeyStatus.set(mapKey, result)
      }
    } catch (e) {
      agencyKeyStatus.set(mapKey, { ok: false, msg: toErrorMsg(e) })
    }
  }

  // ── 2. Atualiza status das agency_integrations com erro ───────
  for (const integ of (agencyIntegrations ?? [])) {
    const mapKey = `${integ.agency_id}:${integ.type}`
    const result = agencyKeyStatus.get(mapKey)
    if (!result) continue

    const newStatus = result.ok ? 'active' : 'error'
    if (newStatus !== integ.status) {
      await supabase
        .from('agency_integrations')
        .update({ status: newStatus, last_tested_at: now.toISOString() })
        .eq('id', integ.id)
    }
  }

  // ── 3. Busca integrações de clientes ──────────────────────────
  const { data: clientIntegrations } = await supabase
    .from('client_integrations')
    .select('id, client_id, agency_id, type, status, last_sync_at, clients(name, nome_resumido)')
    .in('type', ['asaas', 'dom_pagamentos', 'whatsapp'])
    .eq('status', 'connected')  // só verifica as que estão "connected"

  if (!clientIntegrations?.length) {
    console.log('[cron] check-integrations: nenhuma integração para verificar')
    return NextResponse.json({
      checkedIntegrations: 0, alertsCreated: 0,
    })
  }

  // ── 4. Busca alertas de integração criados nos últimos 7 dias ─
  // (para não duplicar)
  const cutoff7d = new Date(now.getTime() - 7 * 86400000).toISOString()
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('client_id, type')
    .in('type', ['integration_error', 'integration_stale'])
    .gte('created_at', cutoff7d)

  const recentAlertKeys = new Set(
    (recentAlerts ?? []).map(a => `${a.type}:${a.client_id}`)
  )

  let alertsCreated = 0
  let markedError   = 0

  // ── 5. Mapa de e-mail dos admins por agência (para e-mails de alerta) ─
  const agencyAdminEmail = new Map<string, { email: string; agencyName: string }>()

  async function getAgencyAdmin(agencyId: string) {
    if (agencyAdminEmail.has(agencyId)) return agencyAdminEmail.get(agencyId)!
    const { data: agency } = await supabase
      .from('agencies').select('name').eq('id', agencyId).maybeSingle()
    const { data: au } = await supabase
      .from('agency_users').select('user_id').eq('agency_id', agencyId).eq('role', 'admin').limit(1).maybeSingle()
    let email = ''
    if (au?.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(au.user_id)
      email = authUser.user?.email ?? ''
    }
    const entry = { email, agencyName: agency?.name ?? '' }
    agencyAdminEmail.set(agencyId, entry)
    return entry
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zerochurn.brandosystem.com'

  // ── 6. Avalia cada integração de cliente ──────────────────────
  for (const integ of clientIntegrations) {
    const clientRaw  = integ.clients as unknown as { name: string; nome_resumido?: string } | { name: string; nome_resumido?: string }[] | null
    const clientData = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw
    const clientName = clientData?.nome_resumido ?? clientData?.name ?? 'Cliente'
    const clientUrl  = `${appUrl}/clientes/${integ.client_id}`

    // Asaas e Dom: verifica se a chave da agência ainda é válida
    if (integ.type === 'asaas' || integ.type === 'dom_pagamentos') {
      const mapKey = `${integ.agency_id}:${integ.type}`
      const result = agencyKeyStatus.get(mapKey)

      if (result && !result.ok) {
        // Marca a integração do cliente como error
        await supabase
          .from('client_integrations')
          .update({ status: 'error' })
          .eq('id', integ.id)
        markedError++

        // Cria alerta se ainda não existe
        const alertKey = `integration_error:${integ.client_id}`
        if (!recentAlertKeys.has(alertKey)) {
          const label = integ.type === 'asaas' ? 'Asaas' : 'Dom Pagamentos'
          await supabase.from('alerts').insert({
            agency_id: integ.agency_id,
            client_id: integ.client_id,
            type:      'integration_error',
            severity:  'high',
            message:   `Integração ${label} com erro para ${clientName}: ${result.msg ?? 'credencial inválida'}. Verifique em Configurações → Integrações.`,
            is_read:   false,
          })
          recentAlertKeys.add(alertKey)
          alertsCreated++

          // Envia e-mail de alerta para o admin da agência
          const admin = await getAgencyAdmin(integ.agency_id)
          if (admin.email) {
            await sendIntegrationAlert({
              to:          admin.email,
              agencyName:  admin.agencyName,
              clientName,
              integration: integ.type === 'asaas' ? 'asaas' : 'dom',
              reason:      result.msg ?? 'Credencial inválida ou expirada',
              clientUrl,
            }).catch(e => console.warn('[check-integrations] email falhou:', e))
          }
        }
      }
    }

    // WhatsApp: alerta se a última sincronização foi há mais de 30 dias
    if (integ.type === 'whatsapp' && integ.last_sync_at) {
      const lastSync     = new Date(integ.last_sync_at)
      const daysSinceSyc = Math.floor((now.getTime() - lastSync.getTime()) / 86400000)

      if (daysSinceSyc >= 30) {
        const alertKey = `integration_stale:${integ.client_id}`
        if (!recentAlertKeys.has(alertKey)) {
          await supabase.from('alerts').insert({
            agency_id: integ.agency_id,
            client_id: integ.client_id,
            type:      'integration_stale',
            severity:  'medium',
            message:   `WhatsApp de ${clientName} não sincroniza há ${daysSinceSyc} dias. Verifique se o grupo ainda está acessível.`,
            is_read:   false,
          })
          recentAlertKeys.add(alertKey)
          alertsCreated++

          // Envia e-mail de alerta para o admin da agência
          const admin = await getAgencyAdmin(integ.agency_id)
          if (admin.email) {
            await sendIntegrationAlert({
              to:          admin.email,
              agencyName:  admin.agencyName,
              clientName,
              integration: 'whatsapp',
              reason:      `Sem sincronização há ${daysSinceSyc} dias (último: ${new Date(integ.last_sync_at).toLocaleDateString('pt-BR')})`,
              clientUrl,
            }).catch(e => console.warn('[check-integrations] email falhou:', e))
          }
        }
      }
    }
  }

  const summary = {
    date:                now.toISOString().slice(0, 10),
    agencyKeysChecked:   agencyKeyStatus.size,
    clientIntegrations:  clientIntegrations.length,
    markedError,
    alertsCreated,
  }

  console.log('[cron] check-integrations concluído:', summary)
  return NextResponse.json(summary)
}
