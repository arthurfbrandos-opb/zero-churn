/**
 * GET  /api/asaas/payments?clientId=xxx — lista pagamentos + assinaturas de todos os customers Asaas do cliente
 * POST /api/asaas/payments              — cria uma cobrança avulsa no Asaas
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { createPayment, getCustomerPayments, getActiveSubscriptions } from '@/lib/asaas/client'

// GET — lista pagamentos e assinaturas de todos os customers Asaas do cliente
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'clientId obrigatório' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Chave Asaas da agência
    const { data: agencyInteg } = await supabase
      .from('agency_integrations').select('encrypted_key, status').eq('type', 'asaas').single()
    if (!agencyInteg?.encrypted_key || agencyInteg.status !== 'active')
      return NextResponse.json({ payments: [], subscriptions: [], accounts: [] })

    const { api_key: apiKey } = await decrypt<{ api_key: string }>(agencyInteg.encrypted_key)

    // Busca integrações Asaas do cliente
    const { data: integrations } = await supabase
      .from('client_integrations')
      .select('id, label, credentials, status')
      .eq('client_id', clientId)
      .eq('type', 'asaas')

    if (!integrations || integrations.length === 0)
      return NextResponse.json({ payments: [], subscriptions: [], accounts: [] })

    // Para cada customer Asaas, busca pagamentos e assinaturas em paralelo
    const results = await Promise.all(
      integrations.map(async integ => {
        const creds = integ.credentials as { customer_id?: string; customer_name?: string } | null
        const customerId = creds?.customer_id
        if (!customerId) return { payments: [], subscriptions: [], customerId: null, customerName: null }

        const [paymentsRes, subsRes] = await Promise.allSettled([
          getCustomerPayments(apiKey, customerId, 100),
          getActiveSubscriptions(apiKey, customerId),
        ])

        return {
          customerId,
          customerName: creds?.customer_name ?? integ.label ?? customerId,
          payments:     paymentsRes.status === 'fulfilled' ? paymentsRes.value.data : [],
          subscriptions: subsRes.status === 'fulfilled' ? subsRes.value.data : [],
        }
      })
    )

    // Merge de todos os customers
    const allPayments      = results.flatMap(r => r.payments.map(p => ({ ...p, _customerName: r.customerName })))
    const allSubscriptions = results.flatMap(r => r.subscriptions.map(s => ({ ...s, _customerName: r.customerName })))
    const accounts         = results.filter(r => r.customerId).map(r => ({ id: r.customerId!, name: r.customerName! }))

    // Ordena pagamentos: mais recentes primeiro por dueDate
    allPayments.sort((a, b) => b.dueDate.localeCompare(a.dueDate))

    return NextResponse.json({ payments: allPayments, subscriptions: allSubscriptions, accounts })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/asaas/payments]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
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
