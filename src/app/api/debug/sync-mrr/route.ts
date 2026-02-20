import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { getCustomerMrr } from '@/lib/asaas/client'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Endpoint para sincronizar MRR do Asaas para o banco
 * GET /api/debug/sync-mrr?clientId=xxx
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  
  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId') ?? '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
  
  try {
    // 1. Busca cliente e integração Asaas
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, agency_id, contract_value')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const { data: integration } = await supabase
      .from('client_integrations')
      .select('credentials')
      .eq('client_id', clientId)
      .eq('type', 'asaas')
      .single()

    if (!integration?.credentials) {
      return NextResponse.json({ error: 'Cliente sem integração Asaas' }, { status: 404 })
    }

    const customerId = (integration.credentials as any).customer_id

    // 2. Busca API key da agência
    const { data: agencyAsaas } = await supabase
      .from('agency_integrations')
      .select('encrypted_key')
      .eq('agency_id', client.agency_id)
      .eq('type', 'asaas')
      .single()

    if (!agencyAsaas?.encrypted_key) {
      return NextResponse.json({ error: 'Agência sem API key Asaas' }, { status: 404 })
    }

    const { api_key: apiKey } = await decrypt<{ api_key: string }>(agencyAsaas.encrypted_key)

    // 3. Calcula MRR usando a função corrigida
    const mrrCalculado = await getCustomerMrr(apiKey, customerId)

    // 4. Atualiza no banco
    const { error: updateError } = await supabase
      .from('clients')
      .update({ contract_value: mrrCalculado })
      .eq('id', clientId)

    if (updateError) {
      return NextResponse.json({ 
        error: 'Erro ao atualizar banco',
        details: updateError 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      cliente: {
        id: client.id,
        nome: client.name
      },
      antes: {
        contractValue: client.contract_value,
        formatado: client.contract_value 
          ? `R$ ${client.contract_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : 'null'
      },
      depois: {
        contractValue: mrrCalculado,
        formatado: `R$ ${mrrCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
      },
      mensagem: '✅ MRR atualizado com sucesso! Recarregue a página do cliente.'
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Erro ao processar',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
