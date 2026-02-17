/**
 * GET /api/dom/test
 * Testa as credenciais Dom Pagamentos salvas fazendo uma chamada real à API.
 * Retorna: { ok, message, transactions_found?, error? }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { listTransactions, DomCredentials } from '@/lib/dom/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    }

    // Busca credenciais Dom
    const { data: integ } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    if (!integ?.encrypted_key) {
      return NextResponse.json({
        ok: false,
        error: 'Integração Dom Pagamentos não configurada.',
      })
    }

    // Descriptografa
    const creds = await decrypt<DomCredentials>(integ.encrypted_key)
    if (!creds.token) {
      return NextResponse.json({
        ok: false,
        error: 'Token não encontrado nas credenciais salvas.',
      })
    }

    // Faz chamada real à API — busca 1 transação dos últimos 30 dias
    const hoje    = new Date()
    const h30dias = new Date(hoje)
    h30dias.setDate(h30dias.getDate() - 30)

    const startDate = h30dias.toISOString().slice(0, 10)
    const endDate   = hoje.toISOString().slice(0, 10)

    const result = await listTransactions(creds, { start_date: startDate, end_date: endDate, per_page: 1 })

    const total = result.total ?? result.data?.length ?? 0

    return NextResponse.json({
      ok:                  true,
      message:             'Conexão estabelecida com sucesso!',
      transactions_found:  total,
      period:              `${startDate} → ${endDate}`,
      environment:         creds.environment ?? 'production',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Mensagens de erro mais amigáveis
    let friendly = msg
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      friendly = 'Token inválido ou sem permissão. Verifique o token com o suporte Dom.'
    } else if (msg.includes('403') || msg.includes('Forbidden')) {
      friendly = 'Acesso negado. O token pode não ter permissão para listar transações.'
    } else if (msg.includes('404')) {
      friendly = 'Endpoint não encontrado. Verifique se o token é do tipo Checkout.'
    } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
      friendly = 'Erro de rede ao conectar na Dom Pagamentos. Tente novamente.'
    }

    return NextResponse.json({ ok: false, error: friendly })
  }
}
