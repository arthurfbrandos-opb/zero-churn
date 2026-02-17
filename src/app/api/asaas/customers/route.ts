/**
 * GET /api/asaas/customers
 * Retorna todos os customers + quais estão ativos (pagamento nos últimos 90 dias)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { listCustomers, getActiveCustomerIds } from '@/lib/asaas/client'

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
