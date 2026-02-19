#!/usr/bin/env node
/**
 * Script de debug: Investiga credentials do cliente para diagnóstico do bug no_payment_data
 * 
 * Uso:
 *   node scripts/debug-investigate-credentials.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hvpsxypzylqruuufbtxz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHN4eXB6eWxxcnV1dWZidHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzMjY0OTAsImV4cCI6MjA1NDkwMjQ5MH0.OjVILj9pWWxaLCpWI6M3v81wHkWZv6p8hO5lLvpB3O0'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHN4eXB6eWxxcnV1dWZidHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTMyNjQ5MCwiZXhwIjoyMDU0OTAyNDkwfQ.L4uxV8sK4PaVcZ9Jb2i8rJx-vNXt4qAWsPRmJMtkN7Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

const CLIENT_ID = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
const AGENCY_ID = '694e9e9e-8e69-42b8-9953-c3d9595676b9'

console.log('🔍 Investigando bug no_payment_data...\n')

// ── 1. Verifica integração Asaas do cliente ──────────────────────────
console.log('1️⃣  Verificando client_integrations (Asaas)...')

const { data: clientInteg, error: err1 } = await supabase
  .from('client_integrations')
  .select('*')
  .eq('client_id', CLIENT_ID)
  .eq('type', 'asaas')

if (err1) {
  console.error('❌ Erro:', err1.message)
  process.exit(1)
}

if (!clientInteg || clientInteg.length === 0) {
  console.log('❌ Nenhuma integração Asaas encontrada para este cliente!\n')
} else {
  const integ = clientInteg[0]
  console.log('✅ Integração encontrada:')
  console.log(`   ID: ${integ.id}`)
  console.log(`   Status: ${integ.status}`)
  console.log(`   Label: ${integ.label}`)
  console.log(`   Credentials: ${JSON.stringify(integ.credentials, null, 2)}`)
  console.log(`   Tem credentials_enc: ${!!integ.credentials_enc}`)
  console.log(`   Last sync: ${integ.last_sync_at}`)
  console.log(`   Created: ${integ.created_at}\n`)

  // Diagnóstico
  if (!integ.credentials || Object.keys(integ.credentials).length === 0) {
    console.log('🔴 BUG CONFIRMADO: credentials está vazio ou null!')
    console.log('   → data-fetcher.ts não consegue ler customer_id')
    console.log('   → Nenhum pagamento é buscado')
    console.log('   → Flag no_payment_data é gerado\n')
    console.log('💡 Solução: Executar UPDATE para adicionar credentials:')
    console.log(`   UPDATE client_integrations`)
    console.log(`   SET credentials = '{"customer_id": "cus_000155163105", "customer_name": "ODONTOLOGIA INTEGRADA"}'::jsonb`)
    console.log(`   WHERE id = '${integ.id}';\n`)
  } else if (!integ.credentials.customer_id) {
    console.log('🔴 BUG CONFIRMADO: credentials existe mas não tem customer_id!')
    console.log(`   Credentials atual: ${JSON.stringify(integ.credentials)}\n`)
  } else {
    console.log(`✅ Credentials OK! customer_id = ${integ.credentials.customer_id}`)
    console.log('   → Bug pode estar em outro lugar (data-fetcher ou API Asaas)\n')
  }
}

// ── 2. Verifica integração da agência (API key) ──────────────────────
console.log('2️⃣  Verificando agency_integrations (Asaas API key)...')

const { data: agencyInteg, error: err2 } = await supabase
  .from('agency_integrations')
  .select('id, type, status, encrypted_key')
  .eq('agency_id', AGENCY_ID)
  .eq('type', 'asaas')
  .single()

if (err2) {
  console.error('❌ Erro:', err2.message)
} else if (!agencyInteg) {
  console.log('❌ Nenhuma integração Asaas encontrada para a agência!')
} else {
  console.log('✅ Integração da agência encontrada:')
  console.log(`   ID: ${agencyInteg.id}`)
  console.log(`   Status: ${agencyInteg.status}`)
  console.log(`   Tem encrypted_key: ${!!agencyInteg.encrypted_key}\n`)
}

// ── 3. Panorama geral (todas integrações Asaas) ───────────────────────
console.log('3️⃣  Panorama geral de integrações Asaas da agência...')

const { data: allIntegs } = await supabase
  .from('client_integrations')
  .select(`
    id, 
    status,
    credentials,
    clients (name)
  `)
  .eq('agency_id', AGENCY_ID)
  .eq('type', 'asaas')
  .order('created_at', { ascending: false })

if (allIntegs && allIntegs.length > 0) {
  console.log(`✅ ${allIntegs.length} integração(ões) encontrada(s):\n`)
  
  let semCredentials = 0
  let semCustomerId = 0
  let ok = 0

  allIntegs.forEach((i, idx) => {
    const clientName = i.clients?.name ?? 'N/A'
    const hasCredentials = i.credentials && Object.keys(i.credentials).length > 0
    const hasCustomerId = hasCredentials && i.credentials.customer_id

    if (!hasCredentials) semCredentials++
    else if (!hasCustomerId) semCustomerId++
    else ok++

    const status = !hasCredentials ? '🔴 SEM CREDENTIALS' 
                 : !hasCustomerId ? '⚠️  SEM customer_id'
                 : '✅ OK'

    console.log(`   ${idx + 1}. ${clientName}`)
    console.log(`      Status: ${i.status} | Credentials: ${status}`)
    if (hasCustomerId) {
      console.log(`      customer_id: ${i.credentials.customer_id}`)
    }
    console.log('')
  })

  console.log(`📊 Resumo:`)
  console.log(`   ✅ OK: ${ok}`)
  console.log(`   ⚠️  Sem customer_id: ${semCustomerId}`)
  console.log(`   🔴 Sem credentials: ${semCredentials}\n`)

  if (semCredentials > 0 || semCustomerId > 0) {
    console.log('⚠️  PROBLEMA DETECTADO: Algumas integrações estão com credentials incompletos')
    console.log('   Possível causa: /api/asaas/import não está salvando credentials corretamente\n')
  }
} else {
  console.log('❌ Nenhuma integração Asaas encontrada para esta agência\n')
}

console.log('✅ Investigação concluída!')
