/**
 * GET /api/agency/integrations/test-resend
 *
 * Testa a integração Resend da agência autenticada.
 * Busca as credenciais encriptadas, descriptografa e chama GET /domains.
 * Não envia nenhum e-mail — apenas verifica se a chave é válida.
 *
 * Retorna:
 *   { ok: true, domains: number }       — chave válida
 *   { ok: false, error: string }        — chave inválida ou sem integração
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt }      from '@/lib/supabase/encryption'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })

    // Busca agency_id
    const { data: au } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).maybeSingle()
    if (!au?.agency_id) return NextResponse.json({ ok: false, error: 'Agência não encontrada' }, { status: 404 })

    // Busca integração Resend
    const { data: integ } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('agency_id', au.agency_id)
      .eq('type', 'resend')
      .maybeSingle()

    if (!integ?.encrypted_key) {
      return NextResponse.json({ ok: false, error: 'Integração Resend não configurada' })
    }

    // Descriptografa
    const creds = await decrypt<{ api_key: string; from_email: string }>(integ.encrypted_key)
    if (!creds?.api_key) {
      return NextResponse.json({ ok: false, error: 'Credenciais inválidas no banco' })
    }

    // Testa chamando GET /domains no Resend
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${creds.api_key}` },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg = body?.message ?? body?.name ?? `HTTP ${res.status}`
      return NextResponse.json({ ok: false, error: msg })
    }

    const body = await res.json()
    const domains = body?.data?.length ?? 0

    return NextResponse.json({ ok: true, domains, from_email: creds.from_email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[test-resend]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
