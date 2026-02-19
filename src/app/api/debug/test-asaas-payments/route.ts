/**
 * GET /api/debug/test-asaas-payments
 * 
 * Testa a API Asaas diretamente para verificar se há pagamentos no período.
 * Usa a chave criptografada da agência.
 * 
 * ENDPOINT TEMPORÁRIO DE DEBUG - REMOVER APÓS INVESTIGAÇÃO!
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

  // Busca chave da agência
  const { data: agencyAsaas } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('agency_id', AGENCY_ID)
    .eq('type', 'asaas')
    .maybeSingle()

  if (!agencyAsaas?.encrypted_key) {
    return NextResponse.json({ error: 'Chave Asaas não encontrada' }, { status: 404 })
  }

  let apiKey: string
  try {
    apiKey = await decrypt<string>(agencyAsaas.encrypted_key)
  } catch (err) {
    return NextResponse.json({ 
      error: 'Falha ao descriptografar chave', 
      details: String(err) 
    }, { status: 500 })
  }

  const results: {
    clientId: string
    customerId: string
    period: { start: string; end: string }
    tests: Record<string, unknown>
    diagnosis?: string
    summary?: Record<string, unknown>
  } = {
    clientId: CLIENT_ID,
    customerId: CUSTOMER_ID,
    period: { start: startDate, end: endDate },
    tests: {}
  }

  // ── Teste 1: Pagamentos RECEBIDOS ──────────────────────────────
  try {
    const res = await fetch(
      `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&paymentDate[ge]=${startDate}&paymentDate[le]=${endDate}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`,
      { headers: { 'access_token': apiKey } }
    )
    
    if (!res.ok) {
      const text = await res.text()
      results.tests = { ...results.tests, received: { error: `HTTP ${res.status}: ${text}` } }
    } else {
      const data = await res.json()
      results.tests = {
        ...results.tests,
        received: {
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
    }
  } catch (err) {
    results.tests = { ...results.tests, received: { error: String(err) } }
  }

  // ── Teste 2: Pagamentos PENDENTES ──────────────────────────────
  try {
    const res = await fetch(
      `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=PENDING&limit=100`,
      { headers: { 'access_token': apiKey } }
    )
    
    if (!res.ok) {
      const text = await res.text()
      results.tests = { ...results.tests, pending: { error: `HTTP ${res.status}: ${text}` } }
    } else {
      const data = await res.json()
      results.tests = {
        ...results.tests,
        pending: {
          count: data.data?.length ?? 0,
          payments: data.data?.map((p: Record<string, unknown>) => ({
            id: p.id,
            value: p.value,
            dueDate: p.dueDate,
          })) ?? []
        }
      }
    }
  } catch (err) {
    results.tests = { ...results.tests, pending: { error: String(err) } }
  }

  // ── Teste 3: Pagamentos ATRASADOS ──────────────────────────────
  try {
    const res = await fetch(
      `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=OVERDUE,CHARGEBACK_REQUESTED,CHARGEBACK_DISPUTE&limit=100`,
      { headers: { 'access_token': apiKey } }
    )
    
    if (!res.ok) {
      const text = await res.text()
      results.tests = { ...results.tests, overdue: { error: `HTTP ${res.status}: ${text}` } }
    } else {
      const data = await res.json()
      results.tests = {
        ...results.tests,
        overdue: {
          count: data.data?.length ?? 0,
          payments: data.data?.map((p: Record<string, unknown>) => ({
            id: p.id,
            value: p.value,
            status: p.status,
            dueDate: p.dueDate,
          })) ?? []
        }
      }
    }
  } catch (err) {
    results.tests = { ...results.tests, overdue: { error: String(err) } }
  }

  // ── Teste 4: TODOS os pagamentos (últimos 10) ──────────────────
  try {
    const res = await fetch(
      `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&limit=10`,
      { headers: { 'access_token': apiKey } }
    )
    
    if (!res.ok) {
      const text = await res.text()
      results.tests = { ...results.tests, all: { error: `HTTP ${res.status}: ${text}` } }
    } else {
      const data = await res.json()
      results.tests = {
        ...results.tests,
        all: {
          total: data.totalCount ?? 0,
          showing: data.data?.length ?? 0,
          latest: data.data?.map((p: Record<string, unknown>) => ({
            dueDate: p.dueDate,
            value: p.value,
            status: p.status,
          })) ?? []
        }
      }
    }
  } catch (err) {
    results.tests = { ...results.tests, all: { error: String(err) } }
  }

  // ── Diagnóstico ─────────────────────────────────────────────────
  const receivedCount = (results.tests as Record<string, { count?: number }>).received?.count ?? 0
  const pendingCount = (results.tests as Record<string, { count?: number }>).pending?.count ?? 0
  const overdueCount = (results.tests as Record<string, { count?: number }>).overdue?.count ?? 0
  const totalInPeriod = receivedCount + pendingCount + overdueCount

  results.diagnosis = totalInPeriod === 0
    ? '🟢 Flag no_payment_data está CORRETO! Cliente não tem pagamentos nos últimos 60 dias.'
    : '🔴 BUG CONFIRMADO! API retorna pagamentos mas sistema não detecta. Verificar data-fetcher.ts'

  results.summary = {
    totalInPeriod,
    received: receivedCount,
    pending: pendingCount,
    overdue: overdueCount,
  }

  return NextResponse.json(results)
}
