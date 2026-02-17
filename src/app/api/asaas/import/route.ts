/**
 * POST /api/asaas/import
 * Aceita os dados completos dos customers já selecionados no browser.
 * Não re-busca o Asaas — o browser já tem tudo da listagem.
 *
 * Body: { customers: AsaasCustomer[] }
 *
 * Fluxo:
 *   1. Recebe array de customers com dados completos (email, endereço, etc.)
 *   2. Roda CNPJ enrichment (BrasilAPI) em paralelo com timeout 6s
 *   3. Busca MRR/financeiro do Asaas em paralelo
 *   4. Insere clientes + integração no DB
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { getCustomerFinancialSummary, getCustomerMrr } from '@/lib/asaas/client'
import { lookupCnpj, CnpjEnrichment } from '@/lib/cnpj/client'

interface IncomingCustomer {
  id:               string
  name:             string
  cpfCnpj:          string | null
  email:            string | null
  mobilePhone:      string | null
  phone:            string | null
  additionalEmails: string | null
  address:          string | null
  addressNumber:    string | null
  complement:       string | null
  province:         string | null   // bairro
  postalCode:       string | null
  city:             string | null   // ID numérico — não usar
  cityName:         string | null   // nome legível — usar este
  state:            string | null
}

async function lookupCnpjSafe(cnpj: string, ms = 6000): Promise<CnpjEnrichment | null> {
  if (!cnpj || cnpj.length !== 14) return null
  try {
    return await Promise.race([
      lookupCnpj(cnpj),
      new Promise<null>(r => setTimeout(() => r(null), ms)),
    ])
  } catch { return null }
}

async function getFinancialSafe(apiKey: string, customerId: string) {
  try {
    const [summary, mrr] = await Promise.all([
      getCustomerFinancialSummary(apiKey, customerId),
      getCustomerMrr(apiKey, customerId),
    ])
    return {
      paymentStatus: summary.paymentStatus as 'em_dia' | 'vencendo' | 'inadimplente',
      mrrValue: mrr > 0 ? Math.round(mrr * 100) / 100 : null,
    }
  } catch {
    return { paymentStatus: 'em_dia' as const, mrrValue: null }
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()

    // Suporta formato novo { customers: [...] } e legado { customer_ids: [...] }
    let incoming: IncomingCustomer[] = body.customers ?? []
    if (!incoming.length && body.customer_ids?.length) {
      // Fallback legado — lista mínima para não quebrar
      incoming = body.customer_ids.map((id: string) => ({ id, name: id, cpfCnpj: null, email: null, mobilePhone: null, phone: null, additionalEmails: null, address: null, addressNumber: null, complement: null, province: null, postalCode: null, city: null, cityName: null, state: null }))
    }
    if (!incoming.length) return NextResponse.json({ error: 'Nenhum customer enviado' }, { status: 400 })

    // Busca agency_id
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    const agencyId = agencyUser.agency_id

    // Chave Asaas (para dados financeiros)
    const { data: integration } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'asaas').single()

    let apiKey: string | null = null
    if (integration?.encrypted_key && integration.status === 'active') {
      const creds = await decrypt<{ api_key: string }>(integration.encrypted_key)
      apiKey = creds.api_key
    }

    // ── FASE 1: CNPJ enrichment + dados financeiros em paralelo ──
    const cnpjs = incoming.map(c => String(c.cpfCnpj ?? '').replace(/\D/g, ''))

    const [enrichments, financials] = await Promise.all([
      // CNPJ enrichment para todos em paralelo
      Promise.all(cnpjs.map(cnpj => lookupCnpjSafe(cnpj))),
      // Dados financeiros para todos em paralelo (só se tiver apiKey)
      Promise.all(incoming.map(c =>
        apiKey
          ? getFinancialSafe(apiKey, c.id)
          : Promise.resolve({ paymentStatus: 'em_dia' as const, mrrValue: null })
      )),
    ])

    // ── FASE 2: inserts no DB ────────────────────────────────────
    const results = {
      created:      0,
      skipped:      0,
      errors:       0,
      errorDetails: [] as string[],
      clientIds:    [] as string[],
    }

    for (let i = 0; i < incoming.length; i++) {
      const c        = incoming[i]
      const cnpj     = cnpjs[i]
      const enriched = enrichments[i]
      const fin      = financials[i]

      const customerName = String(c.name ?? '').trim()

      try {
        // Verifica duplicata pelo CNPJ
        if (cnpj) {
          const { data: existing } = await supabase
            .from('clients').select('id').eq('cnpj', cnpj).eq('agency_id', agencyId).maybeSingle()
          if (existing) { results.skipped++; continue }
        }

        // Campos de contato
        const email    = c.email?.trim()                   || enriched?.email    || null
        const telefone = c.mobilePhone?.trim() || c.phone?.trim() || enriched?.telefone || null

        // Email financeiro: additionalEmails → fallback email principal
        const emailFinanceiro = (c.additionalEmails?.trim()
          ? c.additionalEmails.split(',')[0].trim() || null
          : null) ?? email

        // Endereço: Asaas tem prioridade, BrasilAPI preenche o que faltar
        const cepRaw    = (c.postalCode ?? '').replace(/\D/g, '')
        const cepFmt    = cepRaw.length === 8
          ? `${cepRaw.slice(0,5)}-${cepRaw.slice(5)}`
          : (enriched?.cep ?? null)
        const logradouro = c.address      || enriched?.logradouro || null
        const numero     = c.addressNumber || enriched?.numero     || null
        const complement = c.complement   || enriched?.complemento || null
        const bairro     = c.province     || enriched?.bairro     || null
        const cidade     = c.cityName     || enriched?.cidade     || null   // cityName é o nome legível
        const estado     = c.state        || enriched?.estado     || null

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
            cep:              cepFmt,
            logradouro,
            numero,
            complemento:      complement,
            bairro,
            cidade,
            estado,
            client_type:      'mrr',
            mrr_value:        fin.mrrValue,
            payment_status:   fin.paymentStatus,
            status:           'active',
          })
          .select('id').single()

        if (cErr) {
          results.errors++
          results.errorDetails.push(`${customerName}: ${cErr.message}`)
          continue
        }

        results.created++
        results.clientIds.push(newClient.id)

        // Vincula integração Asaas (falha não cancela o cliente)
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
          console.warn(`[import] integração falhou para ${customerName}:`, intErr)
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[import] erro cliente', c.id, err)
        results.errors++
        results.errorDetails.push(`${customerName}: ${msg}`)
      }
    }

    // ── Cria alertas de "cadastro incompleto" para clientes importados ──
    if (results.clientIds.length > 0) {
      const alertRows = results.clientIds.map(clientId => ({
        agency_id: agencyId,
        client_id: clientId,
        type:      'registration_incomplete',
        severity:  'medium',
        message:   'Cliente importado do Asaas. Confirme e complete o cadastro: contrato, cobranças, WhatsApp e contexto.',
        is_read:   false,
      }))
      await supabase.from('alerts').insert(alertRows).throwOnError()
    }

    return NextResponse.json({
      success:      true,
      created:      results.created,
      skipped:      results.skipped,
      errors:       results.errors,
      errorDetails: results.errorDetails,
      clientIds:    results.clientIds,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/asaas/import]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
