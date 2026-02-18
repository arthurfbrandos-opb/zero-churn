/**
 * POST /api/asaas/sync/[clientId] — vincula cliente ao Asaas e sincroniza
 * GET  /api/asaas/sync/[clientId] — retorna lista de integrações + resumo financeiro
 * DELETE /api/asaas/sync/[clientId]?integrationId=xxx — desvincula uma integração específica
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { getCustomerFinancialSummary, getCustomer } from '@/lib/asaas/client'

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

// GET — lista todas as integrações Asaas deste cliente
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integrations } = await supabase
      .from('client_integrations')
      .select('id, credentials, status, label, last_sync_at')
      .eq('client_id', clientId)
      .eq('type', 'asaas')
      .order('created_at', { ascending: true })

    return NextResponse.json({ integrations: integrations ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — vincula nova conta Asaas ao cliente (permite múltiplas)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const apiKey = await getAgencyApiKey(supabase)
    if (!apiKey) return NextResponse.json({ error: 'Configure o Asaas em Configurações → Integrações primeiro' }, { status: 404 })

    const { asaas_customer_id, customer_name, label } = await req.json()
    if (!asaas_customer_id) return NextResponse.json({ error: 'asaas_customer_id é obrigatório' }, { status: 400 })

    // Verifica duplicata em QUALQUER cliente — evita double-counting no Financeiro
    const { data: existing } = await supabase
      .from('client_integrations')
      .select('id, client_id, clients(name, nome_resumido)')
      .eq('type', 'asaas')
      .filter('credentials->>customer_id', 'eq', asaas_customer_id)
      .maybeSingle()

    if (existing) {
      const clienteNome = (existing.clients as unknown as { name: string; nome_resumido?: string } | null)
      const nome = clienteNome?.nome_resumido ?? clienteNome?.name ?? 'outro cliente'
      const mesmoCli = existing.client_id === clientId
      return NextResponse.json(
        {
          error: mesmoCli
            ? 'Essa conta Asaas já está vinculada a este cliente'
            : `Essa conta Asaas já está vinculada ao cliente "${nome}". Desvincule lá antes de re-vincular aqui.`,
        },
        { status: 409 }
      )
    }

    // Busca agência
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()

    // Busca resumo financeiro
    const summary = await getCustomerFinancialSummary(apiKey, asaas_customer_id)

    // Insere nova integração (sem upsert — permite múltiplas do mesmo tipo)
    const { data: integration, error: insErr } = await supabase
      .from('client_integrations')
      .insert({
        client_id:    clientId,
        agency_id:    agencyUser?.agency_id,
        type:         'asaas',
        status:       'connected',
        label:        label ?? customer_name ?? null,
        credentials:  { customer_id: asaas_customer_id, customer_name: customer_name ?? null },
        last_sync_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insErr) throw insErr

    // Atualiza status de pagamento do cliente com base na nova integração
    await supabase.from('clients')
      .update({ payment_status: summary.paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', clientId)

    return NextResponse.json({ success: true, integration, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH — re-sincroniza status financeiro de uma integração existente
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const apiKey = await getAgencyApiKey(supabase)
    if (!apiKey) return NextResponse.json({ error: 'Asaas não configurado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const integrationId = searchParams.get('integrationId')
    if (!integrationId) return NextResponse.json({ error: 'integrationId obrigatório' }, { status: 400 })

    // Busca a integração existente
    const { data: int } = await supabase
      .from('client_integrations')
      .select('credentials')
      .eq('id', integrationId)
      .eq('client_id', clientId)
      .single()

    if (!int?.credentials?.customer_id) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 })
    }

    const customerId = int.credentials.customer_id

    // Verifica se o customer ainda existe no Asaas
    try {
      await getCustomer(apiKey, customerId)
    } catch (notFoundErr) {
      const msg = notFoundErr instanceof Error ? notFoundErr.message : ''
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        // Customer deletado no Asaas → marca integração como erro + cria alerta
        await supabase.from('client_integrations')
          .update({ status: 'error', last_sync_at: new Date().toISOString() })
          .eq('id', integrationId)

        // Busca agency para criar alerta
        const { data: agencyUser } = await supabase
          .from('agency_users').select('agency_id').eq('user_id', user.id).single()

        if (agencyUser) {
          await supabase.from('alerts').insert({
            agency_id: agencyUser.agency_id,
            client_id: clientId,
            type:      'integration_error',
            severity:  'high',
            message:   `Customer Asaas (${customerId}) não encontrado. O cliente pode ter sido excluído no Asaas. Verifique e desvincule ou re-vincule a conta.`,
            is_read:   false,
          })
        }

        return NextResponse.json({
          success: false,
          error:   'customer_not_found',
          message: 'O customer não foi encontrado no Asaas. Pode ter sido excluído. A integração foi marcada com erro e um alerta foi criado.',
        }, { status: 404 })
      }
      throw notFoundErr
    }

    // Re-sincroniza status financeiro
    const summary = await getCustomerFinancialSummary(apiKey, customerId)

    await supabase.from('client_integrations')
      .update({ last_sync_at: new Date().toISOString(), status: 'connected' })
      .eq('id', integrationId)

    await supabase.from('clients')
      .update({ payment_status: summary.paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', clientId)

    return NextResponse.json({ success: true, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — desvincula uma integração específica pelo ID
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const integrationId = searchParams.get('integrationId')
    if (!integrationId) return NextResponse.json({ error: 'integrationId é obrigatório' }, { status: 400 })

    const { error: delErr } = await supabase
      .from('client_integrations')
      .delete()
      .eq('id', integrationId)
      .eq('client_id', clientId) // garante que pertence a este cliente (segurança)

    if (delErr) throw delErr

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
