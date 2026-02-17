/**
 * GET /api/asaas/customers
 * Lista todos os customers do Asaas usando a chave salva na agência
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { listCustomers } from '@/lib/asaas/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca a chave do Asaas salva pela agência
    const { data: integration } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'asaas')
      .single()

    if (!integration || !integration.encrypted_key) {
      return NextResponse.json(
        { error: 'Integração com Asaas não configurada. Vá em Configurações → Integrações.' },
        { status: 404 }
      )
    }

    if (integration.status !== 'active') {
      return NextResponse.json(
        { error: 'Integração Asaas inativa ou com erro. Reconfigure em Configurações → Integrações.' },
        { status: 403 }
      )
    }

    // Descriptografa
    const creds = await decrypt<{ api_key: string }>(integration.encrypted_key)
    const apiKey = creds.api_key

    // Busca customers paginando
    const allCustomers = []
    let offset = 0
    let hasMore = true

    while (hasMore && offset < 500) {
      const res = await listCustomers(apiKey, 100, offset)
      allCustomers.push(...res.data)
      hasMore = res.hasMore
      offset += 100
    }

    return NextResponse.json({ customers: allCustomers, total: allCustomers.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/asaas/customers]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
