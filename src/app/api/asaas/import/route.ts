/**
 * POST /api/asaas/import
 * Cria clientes no Zero Churn a partir de customers selecionados do Asaas.
 * Body: { customer_ids: string[] }
 *
 * Fluxo por cliente:
 *   1. Verifica duplicata pelo CNPJ
 *   2. Busca financeiro + MRR (Asaas) em paralelo
 *   3. Enriquece CNPJ via BrasilAPI (timeout 5s — não bloqueia se falhar)
 *   4. Cria o cliente
 *   5. Cria a integração Asaas (separado — falha não cancela o cliente)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { listCustomers, getCustomerFinancialSummary, getCustomerMrr } from '@/lib/asaas/client'
import { lookupCnpj } from '@/lib/cnpj/client'

/** Chama lookupCnpj com timeout de 5 s para não travar o import */
async function lookupCnpjSafe(cnpj: string) {
  try {
    const result = await Promise.race([
      lookupCnpj(cnpj),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)),
    ])
    return result
  } catch {
    return null
  }
}

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

    // Busca todos os customers do Asaas
    const allCustomers: Record<string, unknown>[] = []
    let offset = 0, hasMore = true
    while (hasMore && offset < 3000) {
      const res = await listCustomers(apiKey, 100, offset)
      allCustomers.push(...(res.data as unknown as Record<string, unknown>[]))
      hasMore = res.hasMore
      offset += 100
    }

    const selected = allCustomers.filter(c => customer_ids.includes(String(c.id)))

    const results = {
      created:       0,
      skipped:       0,
      errors:        0,
      errorDetails:  [] as string[],
    }

    for (const c of selected) {
      const customerName = String(c.name ?? '').trim()
      const customerId   = String(c.id ?? '').trim()
      const cnpj         = String(c.cpfCnpj ?? '').replace(/\D/g, '')

      try {
        // ── 1. Verifica duplicata ────────────────────────────
        if (cnpj) {
          const { data: existing } = await supabase
            .from('clients').select('id').eq('cnpj', cnpj).eq('agency_id', agencyId).maybeSingle()
          if (existing) { results.skipped++; continue }
        }

        // ── 2. Dados do Asaas ────────────────────────────────
        let paymentStatus: 'em_dia' | 'vencendo' | 'inadimplente' = 'em_dia'
        let mrrValue: number | null = null

        // Email financeiro = additionalEmails do Asaas (campo separado por vírgula)
        const addEmails = String(c.additionalEmails ?? '').trim()
        const emailFinanceiro = addEmails ? addEmails.split(',')[0].trim() || null : null
        const email    = String(c.email    ?? '').trim() || null
        const telefone = String(c.mobilePhone ?? c.phone ?? '').trim() || null

        try {
          const [summary, mrr] = await Promise.all([
            getCustomerFinancialSummary(apiKey, customerId),
            getCustomerMrr(apiKey, customerId),
          ])
          paymentStatus = summary.paymentStatus
          mrrValue = mrr > 0 ? Math.round(mrr * 100) / 100 : null
        } catch { /* financeiro falha? continua com defaults */ }

        // ── 3. Enriquecimento CNPJ ───────────────────────────
        let nomeDecisor: string | null = null
        let segment: string | null = null
        let emailReceita: string | null = null
        let telefoneReceita: string | null = null

        if (cnpj.length === 14) {
          const enriched = await lookupCnpjSafe(cnpj)
          if (enriched) {
            nomeDecisor    = enriched.nomeDecisor
            segment        = enriched.segment
            emailReceita   = enriched.email
            telefoneReceita = enriched.telefone
          }
        }

        // ── 4. Cria o cliente ────────────────────────────────
        const { data: newClient, error: cErr } = await supabase
          .from('clients')
          .insert({
            agency_id:        agencyId,
            name:             customerName,
            nome_resumido:    customerName.split(' ').slice(0, 2).join(' '),
            cnpj:             cnpj || null,
            segment,
            nome_decisor:     nomeDecisor,
            email:            email || emailReceita || null,
            telefone:         telefone || telefoneReceita || null,
            email_financeiro: emailFinanceiro,
            client_type:      'mrr',
            mrr_value:        mrrValue,
            payment_status:   paymentStatus,
            status:           'active',
          })
          .select('id').single()

        if (cErr) {
          results.errors++
          results.errorDetails.push(`${customerName}: ${cErr.message}`)
          continue
        }

        results.created++

        // ── 5. Vincula ao Asaas (falha não cancela o cliente) ─
        try {
          await supabase.from('client_integrations').insert({
            client_id:    newClient.id,
            agency_id:    agencyId,
            type:         'asaas',
            status:       'connected',
            label:        customerName,
            credentials:  { customer_id: customerId, customer_name: customerName },
            last_sync_at: new Date().toISOString(),
          })
        } catch (intErr) {
          // Integração falhou — registra mas não desfaz o cliente criado
          const intMsg = intErr instanceof Error ? intErr.message : String(intErr)
          console.warn(`[import] integração Asaas falhou para ${customerName}:`, intMsg)
          results.errorDetails.push(`Integração ${customerName}: ${intMsg}`)
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[import] erro no customer', customerId, err)
        results.errors++
        results.errorDetails.push(`${customerName}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      created:      results.created,
      skipped:      results.skipped,
      errors:       results.errors,
      errorDetails: results.errorDetails,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/asaas/import]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
