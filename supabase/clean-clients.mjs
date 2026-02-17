/**
 * Apaga TODOS os clientes da conta arthur@emadigital.com.br
 * Uso: node supabase/clean-clients.mjs  (dentro da pasta zero-churn)
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))

const env = {}
readFileSync(join(__dir, '../.env.local'), 'utf-8').split('\n').forEach(line => {
  const t = line.trim()
  if (!t || t.startsWith('#')) return
  const i = t.indexOf('=')
  if (i < 0) return
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
})

const SUPABASE_URL     = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const ARTHUR_EMAIL     = 'arthur@emadigital.com.br'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  // 1. Busca ID do Arthur
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const arthur = users?.find(u => u.email === ARTHUR_EMAIL)
  if (!arthur) { console.log('❌ Arthur não encontrado'); return }
  console.log('✓ Arthur ID:', arthur.id)

  // 2. Busca agência
  const { data: agUser } = await admin.from('agency_users').select('agency_id').eq('user_id', arthur.id).single()
  if (!agUser) { console.log('❌ Agência não encontrada'); return }
  const agencyId = agUser.agency_id
  console.log('✓ Agency ID:', agencyId)

  // 3. Lista clientes
  const { data: clients, error } = await admin.from('clients').select('id, name').eq('agency_id', agencyId)
  if (error) { console.log('❌ Erro:', error.message); return }
  console.log(`✓ ${clients?.length ?? 0} clientes encontrados`)

  if (!clients || clients.length === 0) {
    console.log('✅ Nenhum cliente para excluir — base já está limpa.')
    return
  }

  const ids = clients.map(c => c.id)

  // 4. Remove dependências em cascata
  const dependentes = [
    'health_scores', 'action_items', 'client_integrations',
    'churn_records', 'form_tokens', 'form_submissions',
    'alerts', 'analysis_logs',
  ]
  for (const table of dependentes) {
    const { error: e } = await admin.from(table).delete().in('client_id', ids)
    if (e) console.log(`  ⚠ ${table}:`, e.message)
    else   console.log(`  ✓ ${table} limpa`)
  }

  // 5. Apaga os clientes
  const { error: delErr } = await admin.from('clients').delete().in('id', ids)
  if (delErr) console.log('❌ Erro ao excluir clientes:', delErr.message)
  else        console.log(`\n✅ ${ids.length} cliente(s) excluído(s) com sucesso!`)
}

main().catch(console.error)
