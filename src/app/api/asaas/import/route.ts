/**
 * POST /api/asaas/import
 * Cria clientes no Zero Churn a partir de customers selecionados do Asaas
 * Body: { customer_ids: string[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { listCustomers, getCustomerFinancialSummary, getCustomerMrr } from '@/lib/asaas/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { customer_ids } = await req.json() as { customer_ids: string[] }
    if (!customer_ids?.length) return NextResponse.json({ error: 'Nenhum customer selecionado' }, { status: 400 })

    // Busca agency_id
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    const agencyId = agencyUser.agency_id

    // Busca chave Asaas
    const { data: integration } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'asaas').single()

    if (!integration?.encrypted_key || integration.status !== 'active') {
      return NextResponse.json({ error: 'Asaas não configurado' }, { status: 404 })
    }

    const creds = await decrypt<{ api_key: string }>(integration.encrypted_key)
    const apiKey = creds.api_key

    // Busca todos os customers do Asaas (para pegar detalhes dos selecionados)
    const allCustomers: Record<string, unknown>[] = []
    let offset = 0, hasMore = true
    while (hasMore && offset < 1000) {
      const res = await listCustomers(apiKey, 100, offset)
      allCustomers.push(...res.data as unknown as Record<string, unknown>[])
      hasMore = res.hasMore
      offset += 100
    }

    const selected = allCustomers.filter(c => customer_ids.includes(String(c.id)))

    const results = { created: 0, skipped: 0, errors: 0 }

    for (const c of selected) {
      try {
        // Verifica se já existe pelo CNPJ
        const cnpj = String(c.cpfCnpj ?? '').replace(/\D/g, '')
        if (cnpj) {
          const { data: existing } = await supabase
            .from('clients').select('id').eq('cnpj', cnpj).eq('agency_id', agencyId).maybeSingle()
          if (existing) { results.skipped++; continue }
        }

        // Busca status financeiro e MRR em paralelo
        let paymentStatus = 'em_dia'
        let mrrValue: number | null = null

        try {
          const [summary, mrr] = await Promise.all([
            getCustomerFinancialSummary(apiKey, String(c.id)),
            getCustomerMrr(apiKey, String(c.id)),
          ])
          paymentStatus = summary.paymentStatus
          mrrValue = mrr > 0 ? Math.round(mrr * 100) / 100 : null
        } catch { /* ignora se falhar */ }

        const clientType = mrrValue !== null ? 'mrr' : 'mrr' // padrão MRR; usuário ajusta depois

        // Cria o cliente
        const { data: newClient, error: cErr } = await supabase
          .from('clients')
          .insert({
            agency_id:      agencyId,
            name:           String(c.name ?? ''),
            nome_resumido:  String(c.name ?? '').split(' ').slice(0, 2).join(' '),
            cnpj:           cnpj || null,
            client_type:    clientType,
            mrr_value:      mrrValue,
            payment_status: paymentStatus,
            status:         'active',
          })
          .select('id').single()

        if (cErr) throw cErr

        // Vincula ao Asaas
        await supabase.from('client_integrations').insert({
          client_id:    newClient.id,
          agency_id:    agencyId,
          type:         'asaas',
          status:       'connected',
          credentials:  { customer_id: String(c.id) },
          last_sync_at: new Date().toISOString(),
        })

        results.created++
      } catch (err) {
        console.error('[import] erro no customer', c.id, err)
        results.errors++
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/asaas/import]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
