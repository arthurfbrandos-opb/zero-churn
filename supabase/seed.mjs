/**
 * Zero Churn — Seed de dados
 * Uso: npm run seed
 * Lê o .env.local automaticamente, sem precisar de variáveis de ambiente externas.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// ── Carrega .env.local ────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '../.env.local')

let env = {}
try {
  const raw = readFileSync(envPath, 'utf-8')
  raw.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    env[key] = val
  })
} catch {
  console.error('❌ Arquivo .env.local não encontrado. Crie-o com as chaves do Supabase.')
  process.exit(1)
}

const SUPABASE_URL      = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']
const TARGET_EMAIL      = 'arthur@emadigital.com.br'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Dados dos clientes ────────────────────────────────────────
const CLIENTS = [
  {
    name: 'Clinica Estetica Bella Forma', nome_resumido: 'Bella Forma',
    razao_social: 'Bella Forma Estetica Ltda.', cnpj: '12.345.678/0001-90',
    segment: 'Saude e Estetica', client_type: 'mrr', mrr_value: 4500,
    contract_start: '2025-06-01', contract_end: '2026-06-01',
    payment_status: 'inadimplente', created_at: '2025-06-01T00:00:00Z',
    score: { total: 32, fin: 10, prox: 55, res: 40, nps: 30, risk: 'high',
      diagnosis: 'Cliente apresenta inadimplencia recorrente nos ultimos 2 meses. Engajamento no WhatsApp reduziu 40% e o ultimo formulario indicou insatisfacao com resultados. Recomenda-se contato urgente da gestao.',
      flags: ['Pagamento em atraso ha mais de 30 dias','Queda de engajamento no grupo','NPS abaixo de 6'] },
    form: { res: 5, nps: 6, comment: 'Os resultados melhoraram um pouco mas ainda nao sao os que esperavamos. O atendimento e bom mas precisamos ver mais retorno financeiro.', days_ago: 20 },
    integrations: [{ type: 'whatsapp', status: 'connected' }, { type: 'asaas', status: 'connected' }, { type: 'dom_pagamentos', status: 'disconnected' }],
  },
  {
    name: 'Imobiliaria Casa Certa', nome_resumido: 'Casa Certa',
    razao_social: 'Casa Certa Imoveis S.A.', cnpj: '23.456.789/0001-01',
    segment: 'Imobiliario', client_type: 'mrr', mrr_value: 6800,
    contract_start: '2025-03-01', contract_end: '2026-03-01',
    payment_status: 'vencendo', created_at: '2025-03-01T00:00:00Z',
    score: { total: 58, fin: 60, prox: 65, res: 55, nps: 45, risk: 'medium',
      diagnosis: 'Cliente com performance moderada. Financeiro sob controle porem proximo ao vencimento. Comunicacao ativa mas resultados ainda abaixo do esperado. Priorizar reuniao de alinhamento.',
      flags: ['Contrato vencendo em 15 dias','Resultados abaixo da meta'] },
    form: { res: 6, nps: 5, comment: 'Estamos vendo alguma evolucao mas esperavamos mais leads qualificados ate agora. Vamos conversar na proxima reuniao.', days_ago: 15 },
    integrations: [{ type: 'whatsapp', status: 'connected' }, { type: 'asaas', status: 'connected' }, { type: 'dom_pagamentos', status: 'disconnected' }],
  },
  {
    name: 'TechStart Consultoria', nome_resumido: 'TechStart',
    razao_social: 'TechStart Tecnologia ME', cnpj: '34.567.890/0001-12',
    segment: 'Tecnologia', client_type: 'tcv', tcv_value: 18000,
    contract_start: '2026-01-20', contract_end: '2026-07-20',
    payment_status: 'em_dia', created_at: '2026-01-20T00:00:00Z',
    score: null, form: null,
    integrations: [{ type: 'whatsapp', status: 'connected' }, { type: 'asaas', status: 'disconnected' }, { type: 'dom_pagamentos', status: 'disconnected' }],
  },
  {
    name: 'Sabor e Arte Gastronomia', nome_resumido: 'Sabor & Arte',
    razao_social: 'Sabor e Arte Restaurante Ltda.', cnpj: '45.678.901/0001-23',
    segment: 'Gastronomia', client_type: 'mrr', mrr_value: 2900,
    contract_start: '2025-01-01', contract_end: '2026-01-01',
    payment_status: 'em_dia', created_at: '2025-01-01T00:00:00Z',
    score: { total: 82, fin: 95, prox: 80, res: 78, nps: 85, risk: 'low',
      diagnosis: 'Cliente saudavel e satisfeito. Pagamentos em dia, comunicacao ativa e resultados consistentes. NPS elevado indica potencial de indicacao. Considere proposta de expansao de servicos.',
      flags: [] },
    form: { res: 9, nps: 9, comment: 'Muito satisfeito com os resultados! O movimento no restaurante aumentou visivelmente apos as campanhas. Recomendaria a agencia sim!', days_ago: 10 },
    integrations: [{ type: 'whatsapp', status: 'connected' }, { type: 'asaas', status: 'connected' }, { type: 'dom_pagamentos', status: 'disconnected' }],
  },
  {
    name: 'FitLife Academia', nome_resumido: 'FitLife',
    razao_social: 'FitLife Fitness Ltda.', cnpj: '56.789.012/0001-34',
    segment: 'Fitness e Bem-estar', client_type: 'tcv', tcv_value: 12000,
    contract_start: '2026-02-01', contract_end: '2026-08-01',
    payment_status: 'em_dia', created_at: '2026-02-01T00:00:00Z',
    score: null, form: null,
    integrations: [{ type: 'whatsapp', status: 'disconnected' }, { type: 'asaas', status: 'disconnected' }, { type: 'dom_pagamentos', status: 'disconnected' }],
  },
]

// ── Funções auxiliares ────────────────────────────────────────
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function ok(label, data) {
  console.log(`  ✓ ${label}`)
  return data
}

function fail(label, error) {
  console.error(`  ✗ ${label}:`, error?.message ?? error)
  throw error
}

// ── Seed principal ────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Zero Churn — Seed de dados')
  console.log(`   Alvo: ${TARGET_EMAIL}\n`)

  // 1. Encontra o usuário
  process.stdout.write('→ Buscando usuário... ')
  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) fail('listUsers', usersError)

  const user = users.find(u => u.email === TARGET_EMAIL)
  if (!user) {
    console.error(`\n❌ Usuário "${TARGET_EMAIL}" não encontrado.`)
    console.error('   Crie a conta em /cadastro primeiro e tente novamente.')
    process.exit(1)
  }
  console.log(`${user.id.slice(0, 8)}... ✓`)

  // 2. Encontra a agência
  process.stdout.write('→ Buscando agência... ')
  const { data: agencyUser, error: auError } = await admin
    .from('agency_users').select('agency_id').eq('user_id', user.id).single()
  if (auError) fail('agency_users', auError)
  const agencyId = agencyUser.agency_id
  console.log(`${agencyId.slice(0, 8)}... ✓`)

  // 3. Limpa dados anteriores do seed (idempotente)
  process.stdout.write('→ Limpando dados anteriores... ')
  const { data: existing } = await admin.from('clients').select('id').eq('agency_id', agencyId)
  if (existing?.length) {
    await admin.from('clients').delete().eq('agency_id', agencyId)
  }
  console.log('✓')

  // 4. Insere clientes
  console.log(`\n→ Inserindo ${CLIENTS.length} clientes:`)

  for (const c of CLIENTS) {
    process.stdout.write(`  • ${c.nome_resumido.padEnd(15)}`)

    // Insere cliente
    const insertData = {
      agency_id: agencyId,
      name: c.name, nome_resumido: c.nome_resumido,
      razao_social: c.razao_social, cnpj: c.cnpj,
      segment: c.segment, client_type: c.client_type,
      mrr_value: c.mrr_value ?? null, tcv_value: c.tcv_value ?? null,
      contract_start: c.contract_start, contract_end: c.contract_end,
      payment_status: c.payment_status, status: 'active',
      created_at: c.created_at,
    }

    const { data: client, error: cErr } = await admin
      .from('clients').insert(insertData).select('id').single()
    if (cErr) fail(`insert ${c.nome_resumido}`, cErr)
    const clientId = client.id

    // Integrações
    await admin.from('client_integrations').insert(
      c.integrations.map(i => ({ client_id: clientId, agency_id: agencyId, ...i }))
    )

    // Health score
    if (c.score) {
      const { error: sErr } = await admin.from('health_scores').insert({
        client_id: clientId, agency_id: agencyId,
        score_total: c.score.total,
        score_financeiro: c.score.fin,
        score_proximidade: c.score.prox,
        score_resultado: c.score.res,
        score_nps: c.score.nps,
        churn_risk: c.score.risk,
        diagnosis: c.score.diagnosis,
        flags: c.score.flags,  // array direto — jsonb nao precisa de JSON.stringify
        triggered_by: 'scheduled',
        analyzed_at: daysAgo(7),
      })
      if (sErr) fail(`health_score ${c.nome_resumido}`, sErr)
    }

    // Formulário NPS
    if (c.form) {
      const { error: fErr } = await admin.from('form_submissions').insert({
        client_id: clientId, agency_id: agencyId,
        score_resultado: c.form.res,
        nps_score: c.form.nps,
        comment: c.form.comment,
        submitted_at: daysAgo(c.form.days_ago),
      })
      if (fErr) fail(`form_submission ${c.nome_resumido}`, fErr)
    }

    const badges = []
    if (c.score) badges.push(`score ${c.score.total}`)
    if (c.form)  badges.push(`NPS ${c.form.nps}`)
    if (!c.score) badges.push('em observacao')
    console.log(`[${badges.join(', ')}]`)
  }

  console.log('\n✅ Seed concluído com sucesso!')
  console.log(`   ${CLIENTS.length} clientes inseridos na agência ${agencyId.slice(0, 8)}...`)
  console.log('   Acesse o dashboard para conferir: https://zero-churn.vercel.app/dashboard\n')
}

seed().catch(err => {
  console.error('\n❌ Erro durante o seed:', err.message ?? err)
  process.exit(1)
})
