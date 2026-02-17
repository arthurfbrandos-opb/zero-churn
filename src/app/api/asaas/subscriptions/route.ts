/**
 * GET  /api/asaas/subscriptions?customer=cus_xxx  — lista assinaturas ativas do customer
 * POST /api/asaas/subscriptions                   — cria assinatura recorrente no Asaas
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { createSubscription, getActiveSubscriptions } from '@/lib/asaas/client'

async function getApiKey() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: integration } = await supabase
    .from('agency_integrations').select('encrypted_key, status').eq('type', 'asaas').single()
  if (!integration?.encrypted_key || integration.status !== 'active') return null
  const creds = await decrypt<{ api_key: string }>(integration.encrypted_key)
  return creds.api_key
}

// GET — lista assinaturas ativas para verificar duplicata antes de criar
export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customer')
    if (!customerId) return NextResponse.json({ error: 'customer obrigatório' }, { status: 400 })
    const apiKey = await getApiKey()
    if (!apiKey) return NextResponse.json({ error: 'Não autenticado ou integração inativa' }, { status: 401 })
    const data = await getActiveSubscriptions(apiKey, customerId)
    return NextResponse.json({ subscriptions: data.data, total: data.data.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integration } = await supabase
      .from('agency_integrations').select('encrypted_key, status').eq('type', 'asaas').single()

    if (!integration?.encrypted_key)
      return NextResponse.json({ error: 'Integração Asaas não configurada' }, { status: 404 })
    if (integration.status !== 'active')
      return NextResponse.json({ error: 'Integração Asaas inativa' }, { status: 403 })

    const creds  = await decrypt<{ api_key: string }>(integration.encrypted_key)
    const body   = await request.json()

    const { customer, billingType, value, nextDueDate, endDate, cycle, description } = body
    if (!customer || !billingType || !value || !nextDueDate || !cycle)
      return NextResponse.json({ error: 'Campos obrigatórios: customer, billingType, value, nextDueDate, cycle' }, { status: 400 })

    const subscription = await createSubscription(creds.api_key, { customer, billingType, value, nextDueDate, endDate, cycle, description })
    return NextResponse.json({ subscription })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/asaas/subscriptions]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
