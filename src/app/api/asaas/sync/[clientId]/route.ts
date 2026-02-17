/**
 * POST /api/asaas/sync/[clientId] — vincula cliente ao Asaas e sincroniza
 * GET  /api/asaas/sync/[clientId] — retorna resumo financeiro atual
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { getCustomerFinancialSummary } from '@/lib/asaas/client'

type Params = { params: Promise<{ clientId: string }> }

async function getAgencyApiKey(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('type', 'asaas')
    .single()

  if (!data?.encrypted_key || data.status !== 'active') return null
  const creds = await decrypt<{ api_key: string }>(data.encrypted_key)
  return creds.api_key
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const apiKey = await getAgencyApiKey(supabase)
    if (!apiKey) return NextResponse.json({ error: 'Asaas não configurado' }, { status: 404 })

    const { data: integration } = await supabase
      .from('client_integrations')
      .select('credentials, status')
      .eq('client_id', clientId)
      .eq('type', 'asaas')
      .single()

    if (!integration?.credentials?.customer_id) {
      return NextResponse.json({ error: 'Cliente não vinculado ao Asaas' }, { status: 404 })
    }

    const summary = await getCustomerFinancialSummary(apiKey, integration.credentials.customer_id)
    return NextResponse.json({ summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const apiKey = await getAgencyApiKey(supabase)
    if (!apiKey) return NextResponse.json({ error: 'Configure o Asaas em Configurações → Integrações primeiro' }, { status: 404 })

    const { asaas_customer_id } = await req.json()
    if (!asaas_customer_id) return NextResponse.json({ error: 'asaas_customer_id é obrigatório' }, { status: 400 })

    const summary = await getCustomerFinancialSummary(apiKey, asaas_customer_id)

    await supabase.from('client_integrations').upsert({
      client_id: clientId,
      type: 'asaas',
      status: 'connected',
      credentials: { customer_id: asaas_customer_id },
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'client_id,type' })

    await supabase.from('clients')
      .update({ payment_status: summary.paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', clientId)

    return NextResponse.json({ success: true, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
