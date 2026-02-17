/**
 * POST /api/asaas/sync/[clientId]
 * Vincula um cliente do Zero Churn a um customer do Asaas e sincroniza pagamentos
 *
 * Body: { asaas_customer_id: string }
 *
 * GET /api/asaas/sync/[clientId]
 * Retorna o resumo financeiro atual do cliente via Asaas
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCustomerFinancialSummary, findCustomerByCpfCnpj } from '@/lib/asaas/client'

type Params = { params: Promise<{ clientId: string }> }

// GET — retorna resumo financeiro do cliente
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca a integração Asaas do cliente
    const { data: integration } = await supabase
      .from('client_integrations')
      .select('credentials, status')
      .eq('client_id', clientId)
      .eq('type', 'asaas')
      .single()

    if (!integration || integration.status !== 'connected' || !integration.credentials?.customer_id) {
      return NextResponse.json({ error: 'Integração Asaas não configurada' }, { status: 404 })
    }

    const summary = await getCustomerFinancialSummary(integration.credentials.customer_id)
    return NextResponse.json({ summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/asaas/sync]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — vincula cliente ao Asaas e sincroniza
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { asaas_customer_id } = body

    if (!asaas_customer_id) {
      return NextResponse.json({ error: 'asaas_customer_id é obrigatório' }, { status: 400 })
    }

    // Busca resumo financeiro
    const summary = await getCustomerFinancialSummary(asaas_customer_id)

    // Salva/atualiza integração
    const { error: upsertErr } = await supabase
      .from('client_integrations')
      .upsert({
        client_id:  clientId,
        type:       'asaas',
        status:     'connected',
        credentials: { customer_id: asaas_customer_id },
        last_sync_at: new Date().toISOString(),
      }, { onConflict: 'client_id,type' })

    if (upsertErr) throw upsertErr

    // Atualiza payment_status do cliente
    await supabase
      .from('clients')
      .update({
        payment_status: summary.paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    return NextResponse.json({ success: true, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/asaas/sync]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
