/**
 * Zero Churn — Setup completo do ambiente de demonstração
 *
 * O que faz:
 *   1. Cria usuário demo (demo@zerochurn.com.br) com agência "Agência Demo"
 *   2. Insere 5 clientes fake com health scores, NPS e integrações
 *   3. Limpa os clientes fake da conta arthur@emadigital.com.br
 *
 * Uso: npm run setup-demo
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Carrega .env.local ────────────────────────────────────────
const env = {}
readFileSync(join(__dir, '../.env.local'), 'utf-8').split('\n').forEach(line => {
  const t = line.trim()
  if (!t || t.startsWith('#')) return
  const i = t.indexOf('=')
  if (i < 0) return
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
})

const SUPABASE_URL      = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

const DEMO_EMAIL    = 'demo@zerochurn.com.br'
const DEMO_PASSWORD = 'Demo@Zero2026'
const DEMO_AGENCY   = 'Agência Demo'
const DEMO_OWNER    = 'Usuário Demo'

const ARTHUR_EMAIL  = 'arthur@emadigital.com.br'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Dados fake (5 clientes) ───────────────────────────────────
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
    form: { res: 5, nps: 6, comment: 'Os resultados melhoraram um pouco mas ainda nao sao os que esperavamos.', days_ago: 20 },
    integrations: [{ type: 'whatsapp', status: 'connected' }, { type: 'asaas', status: 'connected' }, { type: 'dom_pagamentos', status: 'disconnected' }],
  },
  {
    name: 'Imobiliaria Casa Certa', nome_resumido: 'Casa Certa',
    razao_social: 'Casa Certa Imoveis S.A.', cnpj: '23.456.789/0001-01',
    segment: 'Imobiliario', client_type: 'mrr', mrr_value: 6800,
    contract_start: '2025-03-01', contract_end: '2026-03-01',
    payment_status: 'vencendo', created_at: '2025-03-01T00:00:00Z',
    score: { total: 58, fin: 60, prox: 65, res: 55, nps: 45, risk: 'medium',
      diagnosis: 'Cliente com performance moderada. Contrato proximo ao vencimento. Comunicacao ativa mas resultados abaixo do esperado.',
      flags: ['Contrato vencendo em 15 dias','Resultados abaixo da meta'] },
    form: { res: 6, nps: 5, comment: 'Estamos vendo alguma evolucao mas esperavamos mais leads qualificados.', days_ago: 15 },
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
      diagnosis: 'Cliente saudavel. Pagamentos em dia, comunicacao ativa e resultados consistentes. Considere proposta de expansao.',
      flags: [] },
    form: { res: 9, nps: 9, comment: 'Muito satisfeito! O movimento aumentou visivelmente apos as campanhas.', days_ago: 10 },
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

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

async function findUser(email) {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return users.find(u => u.email === email) ?? null
}

async function findAgency(userId) {
  const { data } = await admin.from('agency_users').select('agency_id').eq('user_id', userId).single()
  return data?.agency_id ?? null
}

async function insertClients(agencyId) {
  for (const c of CLIENTS) {
    process.stdout.write(`  • ${c.nome_resumido.padEnd(15)}`)

    const { data: client, error } = await admin.from('clients').insert({
      agency_id: agencyId,
      name: c.name, nome_resumido: c.nome_resumido,
      razao_social: c.razao_social, cnpj: c.cnpj,
      segment: c.segment, client_type: c.client_type,
      mrr_value: c.mrr_value ?? null, tcv_value: c.tcv_value ?? null,
      contract_start: c.contract_start, contract_end: c.contract_end,
      payment_status: c.payment_status, status: 'active',
      created_at: c.created_at,
    }).select('id').single()

    if (error) { console.error('ERRO:', error.message); continue }
    const id = client.id

    await admin.from('client_integrations').insert(
      c.integrations.map(i => ({ client_id: id, agency_id: agencyId, ...i }))
    )

    if (c.score) {
      await admin.from('health_scores').insert({
        client_id: id, agency_id: agencyId,
        score_total: c.score.total, score_financeiro: c.score.fin,
        score_proximidade: c.score.prox, score_resultado: c.score.res,
        score_nps: c.score.nps, churn_risk: c.score.risk,
        diagnosis: c.score.diagnosis, flags: c.score.flags,
        triggered_by: 'scheduled', analyzed_at: daysAgo(7),
      })
    }

    if (c.form) {
      await admin.from('form_submissions').insert({
        client_id: id, agency_id: agencyId,
        score_resultado: c.form.res, nps_score: c.form.nps,
        comment: c.form.comment, submitted_at: daysAgo(c.form.days_ago),
      })
    }

    const badges = []
    if (c.score) badges.push(`score ${c.score.total}`)
    if (c.form)  badges.push(`NPS ${c.form.nps}`)
    if (!c.score) badges.push('em observacao')
    console.log(`[${badges.join(', ')}]`)
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Zero Churn — Setup de ambientes\n')

  // ── 1. Conta demo ─────────────────────────────────────────
  console.log('━━━ CONTA DEMO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let demoUser = await findUser(DEMO_EMAIL)

  if (demoUser) {
    console.log(`✓ Usuário demo já existe: ${demoUser.id.slice(0, 8)}...`)
  } else {
    process.stdout.write('→ Criando usuário demo... ')
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL, password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_OWNER },
    })
    if (error) { console.error('ERRO:', error.message); process.exit(1) }
    demoUser = data.user
    console.log(`${demoUser.id.slice(0, 8)}... ✓`)

    // Cria agência
    process.stdout.write('→ Criando agência demo... ')
    const slug = `agencia-demo-${Date.now()}`
    const { data: agency, error: aErr } = await admin
      .from('agencies').insert({ name: DEMO_AGENCY, slug }).select('id').single()
    if (aErr) { console.error('ERRO:', aErr.message); process.exit(1) }
    console.log(`${agency.id.slice(0, 8)}... ✓`)

    // Vincula
    await admin.from('agency_users').insert({
      agency_id: agency.id, user_id: demoUser.id, role: 'admin',
    })
    console.log('→ Usuário vinculado à agência ✓')
  }

  const demoAgencyId = await findAgency(demoUser.id)
  if (!demoAgencyId) { console.error('ERRO: agência demo não encontrada'); process.exit(1) }

  // Limpa e re-insere clientes demo
  process.stdout.write('→ Limpando clientes demo anteriores... ')
  await admin.from('clients').delete().eq('agency_id', demoAgencyId)
  console.log('✓')

  console.log(`→ Inserindo ${CLIENTS.length} clientes demo:`)
  await insertClients(demoAgencyId)

  // ── 2. Conta real (arthur) — limpa fake ───────────────────
  console.log('\n━━━ CONTA REAL (arthur) ━━━━━━━━━━━━━━━━━━━━━')

  const arthurUser = await findUser(ARTHUR_EMAIL)
  if (!arthurUser) {
    console.log(`⚠️  Usuário ${ARTHUR_EMAIL} não encontrado — nada a limpar.`)
  } else {
    const arthurAgencyId = await findAgency(arthurUser.id)
    if (arthurAgencyId) {
      process.stdout.write('→ Removendo clientes fake do arthur... ')
      const { error } = await admin.from('clients').delete().eq('agency_id', arthurAgencyId)
      if (error) console.error('ERRO:', error.message)
      else console.log('✓ Carteira limpa — pronta para clientes reais')
    }
  }

  // ── Resumo ────────────────────────────────────────────────
  console.log('\n━━━ CREDENCIAIS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n  🎭 CONTA DEMO (clientes fake)`)
  console.log(`     Email:  ${DEMO_EMAIL}`)
  console.log(`     Senha:  ${DEMO_PASSWORD}`)
  console.log(`     URL:    https://zero-churn.vercel.app/login`)
  console.log(`\n  👤 CONTA REAL`)
  console.log(`     Email:  ${ARTHUR_EMAIL}`)
  console.log(`     Carteira limpa — cadastre seus clientes reais`)
  console.log(`\n✅ Setup concluído!\n`)
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message ?? err)
  process.exit(1)
})
