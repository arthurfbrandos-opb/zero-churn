#!/usr/bin/env node
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const { data, error } = await supabase
  .from('clients')
  .select('id, name, agency_id')
  .ilike('name', '%ODONTOLOGIA%INTEGRADA%')
  .limit(1)
  .single()

if (error || !data) {
  console.error('❌ Cliente não encontrado:', error)
  process.exit(1)
}

console.log('✅ Cliente encontrado:')
console.log(`ID: ${data.id}`)
console.log(`Nome: ${data.name}`)
console.log(`Agency ID: ${data.agency_id}`)
console.log(`\nURL de teste:\nhttps://zerochurn.brandosystem.com/api/debug/force-analysis?clientId=${data.id}`)
