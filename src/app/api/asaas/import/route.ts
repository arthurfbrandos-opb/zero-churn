/**
 * POST /api/asaas/import
 * Cria clientes no Zero Churn a partir de customers selecionados do Asaas.
 *
 * Estratégia de performance:
 *   - Busca detalhes individuais de cada customer selecionado em PARALELO
 *     (GET /customers/{id} retorna additionalEmails, endereço completo, etc.)
 *   - CNPJ enrichment (BrasilAPI) em paralelo, timeout 8s por CNPJ
 *   - Dados financeiros (Asaas) em paralelo
 *   - Inserts no DB em sequência (após todos os fetches)
 *   - Integração Asaas separada do cliente — falha não cancela a criação
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import {
  listCustomers,
  getCustomer,
  getCustomerFinancialSummary,
  getCustomerMrr,
  AsaasCustomer,
} from '@/lib/asaas/client'
import { lookupCnpj, CnpjEnrichment } from '@/lib/cnpj/client'

/** lookupCnpj com timeout configurável */
async function lookupCnpjSafe(cnpj: string, timeoutMs = 8000): Promise<CnpjEnrichment | null> {
  if (!cnpj || cnpj.length !== 14) return null
  try {
    return await Promise.race([
      lookupCnpj(cnpj),
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ])
  } catch {
    return null
  }
}

/** Dados financeiros com fallback seguro */
async function getFinancialSafe(apiKey: string, customerId: string) {
  try {
    const [summary, mrr] = await Promise.all([
      getCustomerFinancialSummary(apiKey, customerId),
      getCustomerMrr(apiKey, customerId),
    ])
    return { paymentStatus: summary.paymentStatus, mrrValue: mrr > 0 ? Math.round(mrr * 100) / 100 : null }
  } catch {
    return { paymentStatus: 'em_dia' as const, mrrValue: null }
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

    // Chave Asaas
    const { data: integration } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'asaas').single()

    if (!integration?.encrypted_key || integration.status !== 'active') {
      return NextResponse.json({ error: 'Asaas não configurado' }, { status: 404 })
    }

    const creds = await decrypt<{ api_key: string }>(integration.encrypted_key)
    const apiKey = creds.api_key

    // ── FASE 1: resolve IDs selecionados ─────────────────────────
    // Se a lista de clientes já foi carregada no browser, só precisamos dos selecionados
    // Buscamos todos para filtrar (até 3000 customers)
    let selectedFromList: Record<string, unknown>[] = []
    {
      const all: Record<string, unknown>[] = []
      let offset = 0, hasMore = true
      while (hasMore && offset < 3000) {
        const res = await listCustomers(apiKey, 100, offset)
        all.push(...(res.data as unknown as Record<string, unknown>[]))
        hasMore = res.hasMore
        offset += 100
      }
      selectedFromList = all.filter(c => customer_ids.includes(String(c.id)))
    }

    if (!selectedFromList.length) {
      return NextResponse.json({ error: 'Nenhum dos customers selecionados foi encontrado' }, { status: 404 })
    }

    // ── FASE 2: busca detalhes COMPLETOS de cada customer em paralelo ──
    // GET /customers/{id} retorna additionalEmails, endereço, etc.
    const customerDetails: (AsaasCustomer | null)[] = await Promise.all(
      selectedFromList.map(c =>
        getCustomer(apiKey, String(c.id)).catch(() => null)
      )
    )

    // ── FASE 3: CNPJ enrichment em paralelo ──────────────────────
    const cnpjs = customerDetails.map(c => String(c?.cpfCnpj ?? '').replace(/\D/g, ''))
    const enrichments: (CnpjEnrichment | null)[] = await Promise.all(
      cnpjs.map(cnpj => lookupCnpjSafe(cnpj))
    )

    // ── FASE 4: dados financeiros em paralelo ────────────────────
    const financials = await Promise.all(
      customerDetails.map(c =>
        c ? getFinancialSafe(apiKey, c.id) : Promise.resolve({ paymentStatus: 'em_dia' as const, mrrValue: null })
      )
    )

    // ── FASE 5: inserts no DB ────────────────────────────────────
    const results = {
      created:      0,
      skipped:      0,
      errors:       0,
      errorDetails: [] as string[],
    }

    for (let i = 0; i < customerDetails.length; i++) {
      const c = customerDetails[i]
      if (!c) { results.errors++; continue }

      const customerName = String(c.name ?? '').trim()
      const cnpj         = cnpjs[i]
      const enriched     = enrichments[i]
      const financial    = financials[i]

      try {
        // Verifica duplicata pelo CNPJ
        if (cnpj) {
          const { data: existing } = await supabase
            .from('clients').select('id').eq('cnpj', cnpj).eq('agency_id', agencyId).maybeSingle()
          if (existing) { results.skipped++; continue }
        }

        // Monta os campos de contato (Asaas tem prioridade; Receita preenche o que faltar)
        const email    = c.email?.trim()    || enriched?.email    || null
        const telefone = (c.mobilePhone?.trim() || c.phone?.trim()) || enriched?.telefone || null

        // additionalEmails do Asaas → email financeiro; se não tiver, usa o email principal
        const emailFinanceiro = (c.additionalEmails?.trim()
          ? c.additionalEmails.split(',')[0].trim() || null
          : null) ?? email

        // Endereço: do Asaas quando disponível, fallback para Receita
        const logradouro  = c.address     || enriched?.logradouro  || null
        const numero      = c.addressNumber || enriched?.numero     || null
        const complemento = c.complement  || enriched?.complemento || null
        const bairro      = c.province    || enriched?.bairro      || null
        const cidade      = c.city        || enriched?.cidade       || null
        const estado      = c.state       || enriched?.estado       || null
        const cep         = c.postalCode?.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')
                          || enriched?.cep || null

        // Cria o cliente
        const { data: newClient, error: cErr } = await supabase
          .from('clients')
          .insert({
            agency_id:        agencyId,
            name:             customerName,
            nome_resumido:    customerName.split(' ').slice(0, 2).join(' '),
            cnpj:             cnpj || null,
            segment:          enriched?.segment     ?? null,
            nome_decisor:     enriched?.nomeDecisor ?? null,
            email,
            telefone,
            email_financeiro: emailFinanceiro,
            client_type:      'mrr',
            mrr_value:        financial.mrrValue,
            payment_status:   financial.paymentStatus,
            status:           'active',
          })
          .select('id').single()

        if (cErr) {
          results.errors++
          results.errorDetails.push(`${customerName}: ${cErr.message}`)
          continue
        }

        results.created++

        // Vincula integração Asaas (falha não cancela o cliente criado)
        try {
          await supabase.from('client_integrations').insert({
            client_id:    newClient.id,
            agency_id:    agencyId,
            type:         'asaas',
            status:       'connected',
            label:        customerName,
            credentials:  { customer_id: c.id, customer_name: customerName },
            last_sync_at: new Date().toISOString(),
          })
        } catch (intErr) {
          const m = intErr instanceof Error ? intErr.message : String(intErr)
          console.warn(`[import] integração falhou para ${customerName}:`, m)
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[import] erro cliente', c.id, err)
        results.errors++
        results.errorDetails.push(`${customerName}: ${msg}`)
      }
    }

    return NextResponse.json({
      success:      true,
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
