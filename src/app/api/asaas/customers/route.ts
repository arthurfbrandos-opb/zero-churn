/**
 * GET /api/asaas/customers?active_days=90
 * Lista customers do Asaas filtrando por pagamento pago nos últimos N dias
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { listCustomers, getActiveCustomerIds } from '@/lib/asaas/client'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca a chave Asaas da agência
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

    // Parâmetro de filtro (padrão: 90 dias)
    const activeDays = parseInt(req.nextUrl.searchParams.get('active_days') ?? '90', 10)

    // Busca em paralelo: todos os customers + IDs ativos
    const [customersResult, activeIds] = await Promise.all([
      (async () => {
        const all = []
        let offset = 0
        let hasMore = true
        while (hasMore && offset < 1000) {
          const res = await listCustomers(apiKey, 100, offset)
          all.push(...res.data)
          hasMore = res.hasMore
          offset += 100
        }
        return all
      })(),
      getActiveCustomerIds(apiKey, activeDays),
    ])

    // Filtra apenas clientes com pagamento pago no período
    const filtered = customersResult.filter(c => activeIds.has(c.id))

    return NextResponse.json({
      customers:  filtered,
      total:      filtered.length,
      totalAll:   customersResult.length,
      activeDays,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/asaas/customers]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
