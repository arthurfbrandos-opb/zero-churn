import { toErrorMsg } from '@/lib/utils'
/**
 * GET  /api/agency/integrations  — lista integrações da agência (sem expor as chaves)
 * POST /api/agency/integrations  — salva/atualiza uma integração (criptografa a chave)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/supabase/encryption'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data, error } = await supabase
      .from('agency_integrations')
      .select('id, type, status, last_tested_at, updated_at')

    if (error) {
      // Tabela ainda não existe
      if (error.code === '42P01') return NextResponse.json({ integrations: [] })
      throw error
    }

    return NextResponse.json({ integrations: data ?? [] })
  } catch (err) {
    console.error('[GET /api/agency/integrations]', err)
    return NextResponse.json({ error: 'Erro ao buscar integrações' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { type, credentials } = await req.json()

    // evolution_api é gerenciado pelo fluxo de QR Code (/api/whatsapp/instance/*)
    const hasKey = credentials?.api_key || credentials?.token
    const VALID_TYPES = ['asaas', 'dom_pagamentos', 'resend']
    if (!type || !VALID_TYPES.includes(type) || !hasKey) {
      return NextResponse.json({ error: 'Tipo e credencial são obrigatórios' }, { status: 400 })
    }

    // Busca agency_id
    const { data: agencyUser, error: auErr } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()

    if (auErr || !agencyUser) {
      console.error('[integrations] agency_users error:', auErr)
      return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    }

    // Testa a chave ANTES de criptografar (falha rápido com mensagem clara)
    if (type === 'asaas') {
      try {
        const testRes = await fetch('https://api.asaas.com/v3/customers?limit=1', {
          headers: { 'access_token': credentials.api_key },
          signal: AbortSignal.timeout(8000),
        })
        if (!testRes.ok) {
          const body = await testRes.json().catch(() => ({}))
          const msg = body?.errors?.[0]?.description ?? `HTTP ${testRes.status}`
          return NextResponse.json(
            { error: `Chave inválida: ${msg}` },
            { status: 400 }
          )
        }
      } catch (testErr) {
        const msg = toErrorMsg(testErr)
        console.error('[integrations] asaas test failed:', msg)
        // Se for timeout/rede, salva mesmo assim — não bloqueia o usuário
        if (msg.includes('timeout') || msg.includes('fetch')) {
          console.warn('[integrations] Salvando sem validação (problema de rede)')
        } else {
          return NextResponse.json({ error: `Erro ao testar: ${msg}` }, { status: 400 })
        }
      }
    }

    if (type === 'resend') {
      const apiKey    = credentials.api_key
      const fromEmail = credentials.from_email
      if (!apiKey || !fromEmail) {
        return NextResponse.json({ error: 'API Key e e-mail remetente são obrigatórios' }, { status: 400 })
      }
      // Valida a chave chamando GET /domains (não envia nenhum e-mail)
      try {
        const testRes = await fetch('https://api.resend.com/domains', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        })
        if (!testRes.ok) {
          const body = await testRes.json().catch(() => ({}))
          const msg = body?.message ?? body?.name ?? `HTTP ${testRes.status}`
          return NextResponse.json({ error: `Chave Resend inválida: ${msg}` }, { status: 400 })
        }
      } catch (testErr) {
        const msg = toErrorMsg(testErr)
        if (msg.includes('timeout') || msg.includes('fetch')) {
          console.warn('[integrations] Resend: salvando sem validação (problema de rede)')
        } else {
          return NextResponse.json({ error: `Erro ao testar Resend: ${msg}` }, { status: 400 })
        }
      }
    }

    if (type === 'dom_pagamentos') {
      const token = credentials.token
      const env   = credentials.environment ?? 'production'
      const base  = env === 'sandbox'
        ? 'https://hml-apiv3.dompagamentos.com.br/checkout/sandbox'
        : 'https://apiv3.dompagamentos.com.br/checkout/production'

      try {
        const testRes = await fetch(`${base}/transactions?per_page=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
          },
          signal: AbortSignal.timeout(8000),
        })
        if (!testRes.ok) {
          const body = await testRes.json().catch(() => ({}))
          const msg = body?.message ?? body?.error ?? `HTTP ${testRes.status}`
          return NextResponse.json(
            { error: `Token inválido: ${msg}` },
            { status: 400 }
          )
        }
      } catch (testErr) {
        const msg = toErrorMsg(testErr)
        console.error('[integrations] dom test failed:', msg)
        // Se for timeout/rede, salva mesmo assim — não bloqueia o usuário
        if (msg.includes('timeout') || msg.includes('fetch')) {
          console.warn('[integrations] Dom: salvando sem validação (problema de rede)')
        } else {
          return NextResponse.json({ error: `Erro ao testar Dom Pagamentos: ${msg}` }, { status: 400 })
        }
      }
    }

    // Criptografa
    const encrypted_key = await encrypt(credentials as Record<string, unknown>)

    // Upsert
    const { error: upsertErr } = await supabase
      .from('agency_integrations')
      .upsert(
        {
          agency_id:      agencyUser.agency_id,
          type,
          encrypted_key,
          status:         'active',
          last_tested_at: new Date().toISOString(),
          updated_at:     new Date().toISOString(),
        },
        { onConflict: 'agency_id,type' }
      )

    if (upsertErr) {
      console.error('[integrations] upsert error:', upsertErr)
      if (upsertErr.code === '42P01') {
        return NextResponse.json(
          { error: 'Tabela agency_integrations não existe. Execute o SQL de migração no Supabase.' },
          { status: 500 }
        )
      }
      throw upsertErr
    }

    return NextResponse.json({ success: true, status: 'active' })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[POST /api/agency/integrations]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
