import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Endpoint para debugar pagamentos do cliente ODONTOLOGIA INTEGRADA
 * GET /api/debug/payment-check
 */
export async function GET() {
  const supabase = await createClient()
  
  const clientId = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce' // ODONTOLOGIA INTEGRADA
  
  try {
    // 1. Busca cliente
    const { data: client } = await supabase
      .from('clients')
      .select('*, agencies(*)')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // 2. Busca integrações do cliente
    const { data: integrations } = await supabase
      .from('client_integrations')
      .select('*')
      .eq('client_id', clientId)

    // 3. Busca chave da agência (Asaas)
    const { data: agencyAsaas } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('agency_id', client.agency_id)
      .eq('type', 'asaas')
      .maybeSingle()

    // 4. Monta período de análise
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)

    // 5. Tenta buscar pagamentos (sem decrypt - só para debug)
    const asaasInteg = integrations?.filter(i => i.type === 'asaas') ?? []
    
    const result = {
      cliente: {
        id: client.id,
        nome: client.name,
        agencyId: client.agency_id,
        agencyName: client.agencies?.name
      },
      periodo: {
        inicio: startDate,
        fim: endDate
      },
      integracoes: {
        total: integrations?.length ?? 0,
        asaas: asaasInteg.length,
        detalhes: asaasInteg.map(i => ({
          id: i.id,
          status: i.status,
          hasCredentials: !!i.credentials,
          customerId: i.credentials?.customer_id,
          customerName: i.credentials?.customer_name
        }))
      },
      agencyAsaas: {
        existe: !!agencyAsaas,
        status: agencyAsaas?.status,
        hasKey: !!agencyAsaas?.encrypted_key
      },
      proximoPasso: agencyAsaas?.encrypted_key && asaasInteg.length > 0
        ? 'Credenciais OK - problema deve estar na chamada da API'
        : 'Falta credencial da agência ou integração do cliente'
    }

    return NextResponse.json(result, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Erro ao buscar dados',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
