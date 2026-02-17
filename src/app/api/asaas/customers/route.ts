/**
 * GET /api/asaas/customers
 * Lista todos os customers do Asaas para vinculação com clientes do Zero Churn
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCustomers } from '@/lib/asaas/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json({ error: 'Asaas não configurado' }, { status: 503 })
    }

    // Busca até 500 customers (paginando de 100 em 100)
    const allCustomers = []
    let offset = 0
    let hasMore = true

    while (hasMore && offset < 500) {
      const res = await listCustomers(100, offset)
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
