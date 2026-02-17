/**
 * GET  /api/dom/webhook  → retorna URL do webhook da agência + último evento
 * POST /api/dom/webhook  → ativa a integração Dom (gera URL se não existir)
 * DELETE /api/dom/webhook → desativa (status=inactive)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt, encrypt } from '@/lib/supabase/encryption'
import { DomCredentials } from '@/lib/dom/client'

const ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

function webhookUrl(agencyId: string) {
  return `${ORIGIN}/api/webhooks/dom/${agencyId}`
}

// ── GET ────────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Pega agency_id do usuário
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

  const { data: integ } = await supabase
    .from('agency_integrations')
    .select('id, encrypted_key, status')
    .eq('type', 'dom_pagamentos')
    .maybeSingle()

  // Busca último evento recebido via webhook (alerta Dom)
  const { data: lastAlert } = await supabase
    .from('alerts')
    .select('message, metadata, created_at')
    .eq('agency_id', member.agency_id)
    .contains('metadata', { source: 'dom_pagamentos' })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const url     = webhookUrl(member.agency_id)
  const active  = integ?.status === 'active'

  // Decodifica token (sem expor)
  let hasToken = false
  if (integ?.encrypted_key) {
    try {
      const creds = await decrypt<DomCredentials>(integ.encrypted_key)
      hasToken = Boolean(creds.token)
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    configured:    Boolean(integ),
    active,
    webhook_url:   url,
    agency_id:     member.agency_id,
    has_token:     hasToken,
    last_event:    lastAlert ? {
      message:    lastAlert.message,
      event:      (lastAlert.metadata as Record<string, string>)?.event ?? null,
      received_at: lastAlert.created_at,
    } : null,
  })
}

// ── POST ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    token?:      string
    public_key?: string
  }

  // Pega agency_id
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

  // Verifica se já existe e mantém credenciais anteriores
  const { data: existing } = await supabase
    .from('agency_integrations')
    .select('id, encrypted_key')
    .eq('type', 'dom_pagamentos')
    .maybeSingle()

  let prevCreds: DomCredentials = { token: '' }
  if (existing?.encrypted_key) {
    try { prevCreds = await decrypt<DomCredentials>(existing.encrypted_key) } catch { /* ignore */ }
  }

  // Mescla: mantém token/public_key anteriores se não veio novo
  const newCreds: DomCredentials = {
    ...prevCreds,
    token:        body.token?.trim()      || prevCreds.token      || '',
    public_key:   body.public_key?.trim() || prevCreds.public_key || undefined,
    environment:  'production',
  }

  const encryptedKey = await encrypt(newCreds as unknown as Record<string, unknown>)

  if (existing) {
    await supabase.from('agency_integrations')
      .update({ encrypted_key: encryptedKey, status: 'active' })
      .eq('id', existing.id)
  } else {
    await supabase.from('agency_integrations').insert({
      agency_id:    member.agency_id,
      type:         'dom_pagamentos',
      encrypted_key: encryptedKey,
      status:       'active',
    })
  }

  return NextResponse.json({
    ok:           true,
    webhook_url:  webhookUrl(member.agency_id),
    agency_id:    member.agency_id,
  })
}

// ── DELETE ─────────────────────────────────────────────────────
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  await supabase.from('agency_integrations')
    .update({ status: 'inactive' })
    .eq('type', 'dom_pagamentos')

  return NextResponse.json({ ok: true })
}
