/**
 * GET    /api/dom/sync/[clientId] — lista documentos CPF/CNPJ vinculados ao cliente
 * POST   /api/dom/sync/[clientId] — vincula um CPF/CNPJ ao cliente
 * DELETE /api/dom/sync/[clientId]?integrationId=xxx — desvincula
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ clientId: string }> }

// GET — lista integrações Dom deste cliente
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integrations, error } = await supabase
      .from('client_integrations')
      .select('id, credentials, status, label, created_at')
      .eq('client_id', clientId)
      .eq('type', 'dom_pagamentos')
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ integrations: integrations ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — vincula um CPF/CNPJ de comprador Dom ao cliente
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

    // Verifica duplicata neste cliente
    const { data: existing } = await supabase
      .from('client_integrations')
      .select('id')
      .eq('client_id', clientId)
      .eq('type', 'dom_pagamentos')
      .filter('credentials->>document', 'eq', clean)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Esse documento já está vinculado a este cliente' },
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

    const { data: integration, error: insErr } = await supabase
      .from('client_integrations')
      .insert({
        client_id:   clientId,
        agency_id:   agencyUser?.agency_id,
        type:        'dom_pagamentos',
        status:      'connected',
        label:       label ?? formatted,
        credentials: { document: clean },
      })
      .select('id')
      .single()

    if (insErr) throw insErr
    return NextResponse.json({ success: true, integration, document: formatted })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE — desvincula por integrationId
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
