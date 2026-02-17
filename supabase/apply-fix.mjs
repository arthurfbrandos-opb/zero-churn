/**
 * Aplica o fix de RLS direto via API do Supabase
 * Uso: npm run fix-rls
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))

// Carrega .env.local
const envPath = join(__dir, '../.env.local')
const env = {}
readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx < 0) return
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
})

const SUPABASE_URL     = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SQL = `
create or replace function get_agency_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select agency_id
  from agency_users
  where user_id = auth.uid()
  limit 1;
$$;

drop policy if exists "Ver membros da agencia" on agency_users;
create policy "Ver membros da agencia"
  on agency_users for select
  using (user_id = auth.uid());
`

async function applyFix() {
  console.log('\n🔧 Aplicando fix de RLS...\n')

  const { error } = await admin.rpc('exec_sql', { sql: SQL }).catch(() => ({ error: 'rpc_not_available' }))

  if (error) {
    // rpc exec_sql nao existe no Supabase por padrao — usa o endpoint REST direto
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql: SQL }),
    })

    if (!res.ok) {
      console.log('⚠️  Nao foi possivel aplicar o fix automaticamente.')
      console.log('\n   Execute manualmente no Supabase SQL Editor:')
      console.log('   → Abra o arquivo supabase/fix-rls.sql e cole no SQL Editor\n')
      console.log('─'.repeat(60))
      console.log(SQL)
      console.log('─'.repeat(60))
      return
    }
  }

  console.log('✅ Fix aplicado com sucesso!\n')
}

applyFix().catch(console.error)
