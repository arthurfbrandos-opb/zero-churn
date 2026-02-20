import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { getCustomerMrr, getActiveSubscriptions } from '@/lib/asaas/client'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Endpoint para debugar MRR do cliente ODONTOLOGIA INTEGRADA
 * GET /api/debug/check-mrr
 */
export async function GET() {
  const supabase = await createClient()
  
  const clientId = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
  const agencyId = '694e9e9e-8e69-42b8-9953-c3d9595676b9'
  const customerId = 'cus_000155163105'
  
  try {
    // 1. Busca valor atual no banco
    const { data: client } = await supabase
      .from('clients')
      .select('contract_value, name, client_type')
      .eq('id', clientId)
      .single()

    // 2. Busca API key da agência
    const { data: agencyAsaas } = await supabase
      .from('agency_integrations')
      .select('encrypted_key')
      .eq('agency_id', agencyId)
      .eq('type', 'asaas')
      .single()

    if (!agencyAsaas?.encrypted_key) {
      return NextResponse.json({ error: 'API key não encontrada' }, { status: 404 })
    }

    const { api_key: apiKey } = await decrypt<{ api_key: string }>(agencyAsaas.encrypted_key)

    // 3. Busca subscriptions ativas direto da API Asaas
    const subscriptions = await getActiveSubscriptions(apiKey, customerId)

    // 4. Calcula MRR usando a função corrigida
    const mrrCalculado = await getCustomerMrr(apiKey, customerId)

    // 5. Retorna comparação
    return NextResponse.json({
      cliente: {
        id: clientId,
        nome: client?.name,
        tipo: client?.client_type
      },
      valorNoBanco: {
        contractValue: client?.contract_value,
        formatado: client?.contract_value 
          ? `R$ ${client.contract_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
          : null
      },
      subscriptionsAsaas: {
        total: subscriptions.data.length,
        detalhes: subscriptions.data.map(sub => ({
          id: sub.id,
          value: sub.value,
          cycle: sub.cycle,
          status: sub.status,
          nextDueDate: sub.nextDueDate,
          description: sub.description
        }))
      },
      mrrCalculado: {
        valor: mrrCalculado,
        formatado: `R$ ${mrrCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
      },
      diagnostico: client?.contract_value === mrrCalculado
        ? '✅ Valor no banco está correto'
        : `⚠️ DESATUALIZADO: Banco tem R$ ${client?.contract_value}, deveria ser R$ ${mrrCalculado}`,
      proximoPasso: client?.contract_value !== mrrCalculado
        ? 'Reimporte o cliente do Asaas ou atualize manualmente'
        : 'Nenhuma ação necessária'
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Erro ao processar',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
