/**
 * GET /api/dom/debug?id=2fa6d92e-6f63-4ed7-9f28-919bfbc77bad
 * Retorna a estrutura bruta de uma transação Dom — uso temporário para diagnóstico.
 * REMOVER após mapear os campos corretamente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { DomCredentials, getTransaction, listTransactions } from '@/lib/dom/client'


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integ } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    if (!integ?.encrypted_key) {
      return NextResponse.json({ error: 'Dom Pagamentos não configurado' }, { status: 400 })
    }

    const creds = await decrypt<DomCredentials>(integ.encrypted_key)
    const id = request.nextUrl.searchParams.get('id')

    if (id) {
      // Retorna transação específica
      const tx = await getTransaction(creds, id)
      return NextResponse.json({ transaction: tx, fields: Object.keys(tx) })
    }

    // Sem ID: retorna as 3 primeiras transações para ver a estrutura
    const result = await listTransactions(creds, { per_page: 3 })

    return NextResponse.json({
      total:        result.total,
      sample:       result.data.slice(0, 3),
      fields_found: result.data[0] ? Object.keys(result.data[0]) : [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
