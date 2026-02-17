/**
 * POST /api/asaas/payments — cria uma cobrança avulsa no Asaas
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { createPayment } from '@/lib/asaas/client'

export async function POST(request: Request) {
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

    const { customer, billingType, value, dueDate, description } = body
    if (!customer || !billingType || !value || !dueDate)
      return NextResponse.json({ error: 'Campos obrigatórios: customer, billingType, value, dueDate' }, { status: 400 })

    const payment = await createPayment(creds.api_key, { customer, billingType, value, dueDate, description })
    return NextResponse.json({ payment })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/asaas/payments]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
