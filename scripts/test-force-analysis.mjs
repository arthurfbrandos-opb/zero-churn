#!/usr/bin/env node
/**
 * Script para testar a análise forçada (sem cache)
 * do cliente ODONTOLOGIA INTEGRADA
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 1. Busca cliente ODONTOLOGIA INTEGRADA
  console.log('\n🔍 Buscando cliente ODONTOLOGIA INTEGRADA...\n')
  
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, agency_id')
    .ilike('name', '%ODONTOLOGIA%INTEGRADA%')
    .limit(1)

  if (error || !clients || clients.length === 0) {
    console.error('❌ Cliente não encontrado:', error)
    process.exit(1)
  }

  const client = clients[0]
  console.log('✅ Cliente encontrado:')
  console.log(`   ID: ${client.id}`)
  console.log(`   Nome: ${client.name}`)
  console.log(`   Agency ID: ${client.agency_id}`)

  // 2. Chama endpoint de debug
  const url = `http://localhost:3000/api/debug/force-analysis?clientId=${client.id}`
  console.log(`\n🚀 Chamando: ${url}\n`)

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erro na análise:')
      console.error(JSON.stringify(data, null, 2))
      process.exit(1)
    }

    console.log('\n✅ RESULTADO DA ANÁLISE:\n')
    console.log(JSON.stringify(data.result, null, 2))

    // 3. Verifica se corrigiu o bug
    const hasNoPaymentFlag = data.result?.flags?.includes('no_payment_data')
    const scoreFinanceiro = data.result?.scoreFinanceiro

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 VALIDAÇÃO DO BUG')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Flag no_payment_data: ${hasNoPaymentFlag ? '❌ AINDA PRESENTE' : '✅ CORRIGIDO'}`)
    console.log(`Score Financeiro: ${scoreFinanceiro ?? 'null'}`)
    
    if (!hasNoPaymentFlag && scoreFinanceiro !== null) {
      console.log('\n🎉 BUG CORRIGIDO COM SUCESSO!')
    } else {
      console.log('\n⚠️  BUG AINDA PRESENTE - Investigação necessária')
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (err) {
    console.error('❌ Erro ao chamar API:', err)
    process.exit(1)
  }
}

main()
