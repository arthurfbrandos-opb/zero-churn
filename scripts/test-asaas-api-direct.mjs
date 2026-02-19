#!/usr/bin/env node
/**
 * Teste direto da API Asaas - verifica se realmente há pagamentos no período
 * 
 * Uso:
 *   ASAAS_API_KEY="sua_key" node scripts/test-asaas-api-direct.mjs
 */

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const CUSTOMER_ID = 'cus_000155163105'
const ASAAS_BASE = 'https://api.asaas.com/v3'

if (!ASAAS_API_KEY) {
  console.error('❌ ASAAS_API_KEY não definido')
  console.log('📝 Obter em: Integrações → Asaas → API Key da agência')
  console.log('   Exportar: export ASAAS_API_KEY="sua_key"')
  process.exit(1)
}

const endDate = new Date().toISOString().slice(0, 10)
const startDate = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)

console.log('🔍 Testando API Asaas diretamente...\n')
console.log(`📅 Período: ${startDate} até ${endDate}`)
console.log(`👤 Customer: ${CUSTOMER_ID}\n`)

// ── Função helper para fetch ──────────────────────────────────────
async function fetchAsaas(url) {
  const res = await fetch(url, {
    headers: { 'access_token': ASAAS_API_KEY }
  })
  
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  
  return res.json()
}

// ── 1. Pagamentos RECEBIDOS ───────────────────────────────────────
console.log('1️⃣  Buscando pagamentos RECEBIDOS...')
const receivedUrl = `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&paymentDate[ge]=${startDate}&paymentDate[le]=${endDate}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`

try {
  const received = await fetchAsaas(receivedUrl)
  console.log(`   ✅ ${received.data?.length ?? 0} pagamento(s) encontrado(s)`)
  
  if (received.data?.length > 0) {
    console.log('\n   Detalhes:')
    received.data.forEach((p, i) => {
      console.log(`   ${i+1}. ID: ${p.id}`)
      console.log(`      Valor: R$ ${p.value}`)
      console.log(`      Status: ${p.status}`)
      console.log(`      Vencimento: ${p.dueDate}`)
      console.log(`      Pagamento: ${p.paymentDate ?? 'N/A'}`)
      console.log('')
    })
  }
} catch (err) {
  console.error(`   ❌ Erro: ${err.message}`)
}

// ── 2. Pagamentos PENDENTES ───────────────────────────────────────
console.log('\n2️⃣  Buscando pagamentos PENDENTES...')
const pendingUrl = `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=PENDING&limit=100`

try {
  const pending = await fetchAsaas(pendingUrl)
  console.log(`   ✅ ${pending.data?.length ?? 0} pagamento(s) encontrado(s)`)
  
  if (pending.data?.length > 0) {
    console.log('\n   Detalhes:')
    pending.data.forEach((p, i) => {
      console.log(`   ${i+1}. ID: ${p.id}`)
      console.log(`      Valor: R$ ${p.value}`)
      console.log(`      Vencimento: ${p.dueDate}`)
      console.log('')
    })
  }
} catch (err) {
  console.error(`   ❌ Erro: ${err.message}`)
}

// ── 3. Pagamentos ATRASADOS ───────────────────────────────────────
console.log('\n3️⃣  Buscando pagamentos ATRASADOS...')
const overdueUrl = `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&dueDate[ge]=${startDate}&dueDate[le]=${endDate}&status=OVERDUE,CHARGEBACK_REQUESTED,CHARGEBACK_DISPUTE&limit=100`

try {
  const overdue = await fetchAsaas(overdueUrl)
  console.log(`   ✅ ${overdue.data?.length ?? 0} pagamento(s) encontrado(s)`)
  
  if (overdue.data?.length > 0) {
    console.log('\n   Detalhes:')
    overdue.data.forEach((p, i) => {
      console.log(`   ${i+1}. ID: ${p.id}`)
      console.log(`      Valor: R$ ${p.value}`)
      console.log(`      Status: ${p.status}`)
      console.log(`      Vencimento: ${p.dueDate}`)
      console.log('')
    })
  }
} catch (err) {
  console.error(`   ❌ Erro: ${err.message}`)
}

// ── 4. TODOS os pagamentos (sem filtro de data) ───────────────────
console.log('\n4️⃣  Buscando TODOS os pagamentos do customer (últimos 100)...')
const allUrl = `${ASAAS_BASE}/payments?customer=${CUSTOMER_ID}&limit=100`

try {
  const all = await fetchAsaas(allUrl)
  console.log(`   ✅ ${all.data?.length ?? 0} pagamento(s) total`)
  
  if (all.data?.length > 0) {
    console.log('\n   Últimos 5 pagamentos:')
    all.data.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i+1}. ${p.dueDate} | R$ ${p.value} | ${p.status}`)
    })
  }
} catch (err) {
  console.error(`   ❌ Erro: ${err.message}`)
}

console.log('\n' + '='.repeat(60))
console.log('📊 DIAGNÓSTICO:')
console.log('='.repeat(60))
console.log('')
console.log('Se encontrou 0 pagamentos no período (últimos 60 dias):')
console.log('  → Flag no_payment_data está CORRETO!')
console.log('  → Cliente realmente não tem pagamentos recentes')
console.log('  → Possível churn ou inadimplência')
console.log('')
console.log('Se encontrou pagamentos mas o sistema não detecta:')
console.log('  → Bug está no data-fetcher.ts ou orchestrator.ts')
console.log('  → Verificar logs do Vercel')
console.log('')
