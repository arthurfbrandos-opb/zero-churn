/**
 * GET /api/debug/test-data-fetcher
 * 
 * Simula exatamente o que data-fetcher.ts faz para diagnosticar o bug.
 * Compara com o endpoint /api/asaas/payments que funciona.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'

const CLIENT_ID = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
const CUSTOMER_ID = 'cus_000155163105'
const AGENCY_ID = '694e9e9e-8e69-42b8-9953-c3d9595676b9'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ASAAS_BASE = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'
  const endDate = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)

  console.log('[test-data-fetcher] Período:', startDate, 'até', endDate)

  // ── 1. Busca credenciais exatamente como o data-fetcher faz ──
  const { data: agencyAsaas } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('agency_id', AGENCY_ID)
    .eq('type', 'asaas')
    .maybeSingle()

  if (!agencyAsaas?.encrypted_key) {
    return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 })
  }

  console.log('[test-data-fetcher] Agency integration:', {
    hasKey: !!agencyAsaas.encrypted_key,
    status: agencyAsaas.status
  })

  // ── 2. Descriptografa (pode falhar aqui!) ──
  let apiKey: string
  try {
    apiKey = await decrypt<string>(agencyAsaas.encrypted_key)
    console.log('[test-data-fetcher] Decrypt OK:', apiKey.substring(0, 10) + '...')
  } catch (err) {
    console.error('[test-data-fetcher] Decrypt FAILED:', err)
    return NextResponse.json({ 
      error: 'Falha ao descriptografar',
      details: String(err)
    }, { status: 500 })
  }

  // ── 3. Busca integrações do cliente ──
  const { data: clientIntegs } = await supabase
    .from('client_integrations')
    .select('*')
    .eq('client_id', CLIENT_ID)
    .eq('type', 'asaas')

  console.log('[test-data-fetcher] Client integrations:', clientIntegs?.length ?? 0)

  if (!clientIntegs || clientIntegs.length === 0) {
    return NextResponse.json({ error: 'Cliente sem integrações Asaas' }, { status: 404 })
  }

  const integ = clientIntegs[0]
  const creds = integ.credentials as Record<string, string> | null
  const customerId = creds?.customer_id

  console.log('[test-data-fetcher] Integration details:', {
    hasCredentials: !!creds,
    customerId,
    fullCredentials: creds
  })

  if (!customerId) {
    return NextResponse.json({ 
      error: 'customer_id não encontrado em credentials',
      credentials: creds
    }, { status: 400 })
  }

  // ── 4. TESTE A: Exatamente como data-fetcher.ts faz ──
  const testA_url = `${ASAAS_BASE}/payments?customer=${customerId}&paymentDate[ge]=${startDate}&paymentDate[le]=${endDate}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`
  
  console.log('[test-data-fetcher] Test A URL:', testA_url)

  let testA_result: unknown
  try {
    const res = await fetch(testA_url, {
      headers: { 'access_token': apiKey },
      next: { revalidate: 0 }
    })

    console.log('[test-data-fetcher] Test A HTTP status:', res.status)

    if (!res.ok) {
      const text = await res.text()
      console.error('[test-data-fetcher] Test A error response:', text)
      testA_result = { error: `HTTP ${res.status}`, body: text }
    } else {
      const data = await res.json()
      console.log('[test-data-fetcher] Test A success:', data.data?.length ?? 0, 'payments')
      testA_result = {
        count: data.data?.length ?? 0,
        totalCount: data.totalCount,
        hasMore: data.hasMore,
        payments: data.data?.map((p: Record<string, unknown>) => ({
          id: p.id,
          value: p.value,
          status: p.status,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate,
        })) ?? []
      }
    }
  } catch (err) {
    console.error('[test-data-fetcher] Test A exception:', err)
    testA_result = { error: 'Exception', details: String(err) }
  }

  // ── 5. TESTE B: Como /api/asaas/payments faz (SEM filtros) ──
  const testB_url = `${ASAAS_BASE}/payments?customer=${customerId}&limit=100&sort=dueDate&order=desc`
  
  console.log('[test-data-fetcher] Test B URL:', testB_url)

  let testB_result: unknown
  try {
    const res = await fetch(testB_url, {
      headers: { 'access_token': apiKey }
    })

    console.log('[test-data-fetcher] Test B HTTP status:', res.status)

    if (!res.ok) {
      const text = await res.text()
      testB_result = { error: `HTTP ${res.status}`, body: text }
    } else {
      const data = await res.json()
      console.log('[test-data-fetcher] Test B success:', data.data?.length ?? 0, 'payments')
      testB_result = {
        count: data.data?.length ?? 0,
        payments: data.data?.slice(0, 5).map((p: Record<string, unknown>) => ({
          id: p.id,
          value: p.value,
          status: p.status,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate,
        })) ?? []
      }
    }
  } catch (err) {
    testB_result = { error: 'Exception', details: String(err) }
  }

  // ── 6. TESTE C: Apenas filtro de dueDate (não paymentDate) ──
  const testC_url = `${ASAAS_BASE}/payments?customer=${customerId}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`
  
  let testC_result: unknown
  try {
    const res = await fetch(testC_url, {
      headers: { 'access_token': apiKey }
    })

    if (!res.ok) {
      const text = await res.text()
      testC_result = { error: `HTTP ${res.status}`, body: text }
    } else {
      const data = await res.json()
      testC_result = {
        count: data.data?.length ?? 0,
        payments: data.data?.map((p: Record<string, unknown>) => ({
          id: p.id,
          value: p.value,
          status: p.status,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate,
        })) ?? []
      }
    }
  } catch (err) {
    testC_result = { error: 'Exception', details: String(err) }
  }

  return NextResponse.json({
    period: { start: startDate, end: endDate },
    customerId,
    tests: {
      'A_data_fetcher_exact': {
        description: 'Exatamente como data-fetcher.ts (paymentDate filter)',
        url: testA_url,
        result: testA_result
      },
      'B_ui_endpoint': {
        description: 'Como /api/asaas/payments (sem filtros)',
        url: testB_url,
        result: testB_result
      },
      'C_dueDate_filter': {
        description: 'Filtro por dueDate em vez de paymentDate',
        url: testC_url,
        result: testC_result
      }
    },
    diagnosis: 'Compare os 3 testes. Se A retornar 0 mas B/C retornarem dados, o problema está no filtro de paymentDate.'
  })
}
