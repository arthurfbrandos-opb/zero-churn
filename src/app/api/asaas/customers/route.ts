/**
 * GET /api/asaas/customers
 * Retorna todos os customers + quais estão ativos (pagamento nos últimos 90 dias)
 */
import { NextResponse } from 'next/server'

// DELETE /api/asaas/customers?customerId=xxx — exclui customer no Asaas
export async function DELETE(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId')
    if (!customerId) return NextResponse.json({ error: 'customerId obrigatório' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integ } = await supabase
      .from('agency_integrations').select('encrypted_key, status').eq('type', 'asaas').single()
    if (!integ?.encrypted_key || integ.status !== 'active')
      return NextResponse.json({ error: 'Asaas não configurado' }, { status: 404 })

    const { decrypt } = await import('@/lib/supabase/encryption')
    const { api_key } = await decrypt<{ api_key: string }>(integ.encrypted_key)

    const result = await deleteCustomer(api_key, customerId)
    return NextResponse.json({ deleted: result.deleted ?? true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DELETE /api/asaas/customers]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { NextRequest } from 'next/server'
import { listCustomers, getActiveCustomerIds, createCustomer, deleteCustomer } from '@/lib/asaas/client'

// POST /api/asaas/customers — cria um novo customer no Asaas
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
    const apiKey = creds.api_key
    const body   = await request.json()

    const customer = await createCustomer(apiKey, {
      name:          body.name,
      cpfCnpj:       body.cpfCnpj     ? body.cpfCnpj.replace(/\D/g, '') : undefined,
      email:         body.email        || undefined,
      mobilePhone:   body.mobilePhone  || body.phone || undefined,
      phone:         body.phone        || undefined,
      address:       body.address      || undefined,
      addressNumber: body.addressNumber || undefined,
      complement:    body.complement   || undefined,
      province:      body.province     || undefined,  // bairro
      postalCode:    body.postalCode   ? body.postalCode.replace(/\D/g, '') : undefined,
      state:         body.state        || undefined,
    })

    return NextResponse.json({ customer })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/asaas/customers]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integration } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'asaas')
      .single()

    if (!integration?.encrypted_key) {
      return NextResponse.json(
        { error: 'Integração com Asaas não configurada. Vá em Configurações → Integrações.' },
        { status: 404 }
      )
    }
    if (integration.status !== 'active') {
      return NextResponse.json(
        { error: 'Integração Asaas inativa. Reconfigure em Configurações → Integrações.' },
        { status: 403 }
      )
    }

    const creds = await decrypt<{ api_key: string }>(integration.encrypted_key)
    const apiKey = creds.api_key

    // Busca em paralelo: todos os customers + IDs com pagamento nos últimos 90 dias
    const [allCustomers, activeIds] = await Promise.all([
      (async () => {
        const all = []
        let offset = 0, hasMore = true
        while (hasMore && offset < 1000) {
          const res = await listCustomers(apiKey, 100, offset)
          all.push(...res.data)
          hasMore = res.hasMore
          offset += 100
        }
        return all
      })(),
      getActiveCustomerIds(apiKey, 90),
    ])

    return NextResponse.json({
      customers:  allCustomers,
      activeIds:  Array.from(activeIds), // IDs que tiveram pagamento nos últimos 90 dias
      total:      allCustomers.length,
      activeCount: activeIds.size,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/asaas/customers]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
