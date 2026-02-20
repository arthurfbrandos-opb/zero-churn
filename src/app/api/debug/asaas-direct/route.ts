import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Endpoint para testar chamada DIRETA à API do Asaas
 * GET /api/debug/asaas-direct
 */
export async function GET() {
  const supabase = await createClient()
  
  const clientId = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce' // ODONTOLOGIA INTEGRADA
  const customerId = 'cus_000155163105'
  
  try {
    // 1. Busca cliente
    const { data: client } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // 2. Busca chave da agência
    const { data: agencyAsaas } = await supabase
      .from('agency_integrations')
      .select('encrypted_key')
      .eq('agency_id', client.agency_id)
      .eq('type', 'asaas')
      .single()

    if (!agencyAsaas?.encrypted_key) {
      return NextResponse.json({ error: 'API key não encontrada' }, { status: 404 })
    }

    // 3. Decripta a chave (formato: { api_key: "xxx" })
    const { api_key: apiKey } = await decrypt<{ api_key: string }>(agencyAsaas.encrypted_key)

    // 4. Monta período
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)

    const ASAAS_BASE = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'

    // 5. Chama API do Asaas (RECEIVED com dueDate)
    const receivedUrl = `${ASAAS_BASE}/payments?customer=${customerId}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`
    
    const receivedRes = await fetch(receivedUrl, {
      headers: { 'access_token': apiKey },
      next: { revalidate: 0 },
    })

    const receivedData = await receivedRes.json()

    // 6. Chama também SEM filtro de data (para comparar)
    const allUrl = `${ASAAS_BASE}/payments?customer=${customerId}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`
    
    const allRes = await fetch(allUrl, {
      headers: { 'access_token': apiKey },
      next: { revalidate: 0 },
    })

    const allData = await allRes.json()

    // 7. Retorna resultado comparativo
    return NextResponse.json({
      periodo: {
        inicio: startDate,
        fim: endDate
      },
      customerId,
      chamada1_com_filtro_dueDate: {
        url: receivedUrl,
        status: receivedRes.status,
        totalEncontrado: receivedData.data?.length ?? 0,
        hasMore: receivedData.hasMore,
        primeiros3: receivedData.data?.slice(0, 3).map((p: any) => ({
          id: p.id,
          value: p.value,
          status: p.status,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate
        }))
      },
      chamada2_sem_filtro_data: {
        url: allUrl,
        status: allRes.status,
        totalEncontrado: allData.data?.length ?? 0,
        hasMore: allData.hasMore,
        primeiros3: allData.data?.slice(0, 3).map((p: any) => ({
          id: p.id,
          value: p.value,
          status: p.status,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate
        }))
      },
      diagnostico: receivedData.data?.length > 0 
        ? '✅ Filtro com dueDate FUNCIONA - problema deve ser no data-fetcher'
        : allData.data?.length > 0
          ? '⚠️ Sem filtro retorna dados, mas COM filtro não - problema no filtro de data'
          : '❌ Nenhum pagamento RECEIVED encontrado para este customer'
    }, { 
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
