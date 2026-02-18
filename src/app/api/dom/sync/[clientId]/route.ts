/**
 * GET    /api/dom/sync/[clientId]               — lista documentos CPF/CNPJ vinculados
 * POST   /api/dom/sync/[clientId]               — vincula um CPF/CNPJ + atualiza payment_status
 * PATCH  /api/dom/sync/[clientId]?integrationId — re-sincroniza status financeiro
 * DELETE /api/dom/sync/[clientId]?integrationId — desvincula
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { listTransactions, DomCredentials, DomTransactionStatus } from '@/lib/dom/client'

type Params = { params: Promise<{ clientId: string }> }

// ── Helper: calcula payment_status a partir de transações Dom ────

function calcDomPaymentStatus(
  statuses: DomTransactionStatus[]
): 'em_dia' | 'vencendo' | 'inadimplente' {
  if (statuses.some(s => s === 'chargeback' || s === 'dispute'))
    return 'inadimplente'
  if (statuses.some(s => s === 'not_authorized' || s === 'refused'))
    return 'inadimplente'
  if (statuses.some(s => s === 'pending'))
    return 'vencendo'
  return 'em_dia'
}

// ── Helper: busca credenciais Dom da agência ─────────────────────

async function getDomCreds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('type', 'dom_pagamentos')
    .maybeSingle()

  if (!data?.encrypted_key) return null
  try {
    return await decrypt<DomCredentials>(data.encrypted_key)
  } catch {
    return null
  }
}

// ── GET ──────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integrations, error } = await supabase
      .from('client_integrations')
      .select('id, credentials, status, label, created_at, last_sync_at')
      .eq('client_id', clientId)
      .eq('type', 'dom_pagamentos')
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ integrations: integrations ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST — vincula CPF/CNPJ + calcula payment_status ────────────

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verifica se a integração Dom da agência existe
    const { data: domInteg } = await supabase
      .from('agency_integrations')
      .select('id, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    if (!domInteg) {
      return NextResponse.json(
        { error: 'Configure o Dom Pagamentos em Configurações → Integrações primeiro' },
        { status: 404 }
      )
    }

    const { document, label } = await req.json()
    const clean = (document ?? '').replace(/\D/g, '')
    if (!clean || (clean.length !== 11 && clean.length !== 14)) {
      return NextResponse.json(
        { error: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido' },
        { status: 400 }
      )
    }

    // Verifica duplicata em QUALQUER cliente — evita double-counting
    const { data: existing, error: existErr } = await supabase
      .from('client_integrations')
      .select('id, client_id, clients(name, nome_resumido)')
      .eq('type', 'dom_pagamentos')
      .filter('credentials->>document', 'eq', clean)
      .maybeSingle()

    if (existErr && existErr.code !== 'PGRST116') throw existErr

    if (existing) {
      const clienteNome = existing.clients as unknown as { name: string; nome_resumido?: string } | null
      const nome        = clienteNome?.nome_resumido ?? clienteNome?.name ?? 'outro cliente'
      const mesmoCli    = existing.client_id === clientId
      return NextResponse.json(
        {
          error: mesmoCli
            ? 'Esse documento já está vinculado a este cliente'
            : `Esse documento já está vinculado ao cliente "${nome}". Desvincule lá antes de re-vincular aqui.`,
        },
        { status: 409 }
      )
    }

    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    const formatted =
      clean.length === 11
        ? `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9)}`
        : `${clean.slice(0,2)}.${clean.slice(2,5)}.${clean.slice(5,8)}/${clean.slice(8,12)}-${clean.slice(12)}`

    // Insere a integração
    const { data: integration, error: insErr } = await supabase
      .from('client_integrations')
      .insert({
        client_id:    clientId,
        agency_id:    agencyUser?.agency_id,
        type:         'dom_pagamentos',
        status:       'connected',
        label:        label ?? formatted,
        credentials:  { document: clean },
        last_sync_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insErr) throw insErr

    // FIX 1 — Atualiza payment_status do cliente com base nas transações Dom
    let paymentStatus: 'em_dia' | 'vencendo' | 'inadimplente' = 'em_dia'
    const domCreds = await getDomCreds(supabase)
    if (domCreds) {
      try {
        const result = await listTransactions(domCreds, { per_page: 20 })
        const txs    = (result.data ?? []).filter(tx => {
          const txDoc = (tx.customer_document ?? '').replace(/\D/g, '')
          return txDoc === clean
        })
        if (txs.length > 0) {
          paymentStatus = calcDomPaymentStatus(txs.map(tx => tx.status))
        }
      } catch { /* se falhar, mantém 'em_dia' — não bloqueia o vínculo */ }
    }

    await supabase
      .from('clients')
      .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', clientId)

    return NextResponse.json({ success: true, integration, document: formatted, paymentStatus })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── PATCH — re-sincroniza status financeiro ──────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const integrationId = new URL(req.url).searchParams.get('integrationId')
    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId é obrigatório' }, { status: 400 })
    }

    // Busca a integração
    const { data: integ } = await supabase
      .from('client_integrations')
      .select('credentials, agency_id')
      .eq('id', integrationId)
      .eq('client_id', clientId)
      .single()

    if (!integ?.credentials?.document) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 })
    }

    const doc      = (integ.credentials.document as string).replace(/\D/g, '')
    const domCreds = await getDomCreds(supabase)

    if (!domCreds) {
      return NextResponse.json(
        { error: 'Credenciais Dom Pagamentos não configuradas na agência' },
        { status: 404 }
      )
    }

    // Tenta buscar transações do documento
    let paymentStatus: 'em_dia' | 'vencendo' | 'inadimplente' = 'em_dia'
    let foundTransactions = 0

    try {
      const result = await listTransactions(domCreds, { per_page: 50 })
      const txs    = (result.data ?? []).filter(tx => {
        const txDoc = (tx.customer_document ?? '').replace(/\D/g, '')
        return txDoc === doc
      })

      foundTransactions = txs.length

      if (txs.length > 0) {
        paymentStatus = calcDomPaymentStatus(txs.map(tx => tx.status))
      }

      // Re-sync bem-sucedido — marca integração como connected
      await supabase
        .from('client_integrations')
        .update({ status: 'connected', last_sync_at: new Date().toISOString() })
        .eq('id', integrationId)

    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)

      // Falha na API Dom — marca integração como error e cria alerta
      await supabase
        .from('client_integrations')
        .update({ status: 'error', last_sync_at: new Date().toISOString() })
        .eq('id', integrationId)

      // Busca nome do cliente para o alerta
      const { data: clientData } = await supabase
        .from('clients')
        .select('name, nome_resumido')
        .eq('id', clientId)
        .single()
      const clientName = clientData?.nome_resumido ?? clientData?.name ?? 'Cliente'

      // Cria alerta apenas se não existir um não lido recente
      const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('client_id', clientId)
        .eq('type', 'integration_error')
        .eq('is_read', false)
        .maybeSingle()

      if (!existingAlert) {
        await supabase.from('alerts').insert({
          agency_id: integ.agency_id,
          client_id: clientId,
          type:      'integration_error',
          severity:  'high',
          message:   `Dom Pagamentos com erro para ${clientName}: ${msg}. Verifique as credenciais em Configurações → Integrações.`,
          is_read:   false,
        })
      }

      return NextResponse.json({
        success:  false,
        error:    'dom_fetch_failed',
        message:  msg,
      }, { status: 502 })
    }

    // Atualiza payment_status do cliente
    await supabase
      .from('clients')
      .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', clientId)

    return NextResponse.json({
      success:          true,
      paymentStatus,
      foundTransactions,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── DELETE ───────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const integrationId = new URL(req.url).searchParams.get('integrationId')
    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId é obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('client_integrations')
      .delete()
      .eq('id', integrationId)
      .eq('client_id', clientId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
