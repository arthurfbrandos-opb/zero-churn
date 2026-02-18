/**
 * GET /api/financeiro?mes=2026-02
 *
 * Agrega dados financeiros de TODOS os clientes — Asaas + Dom Pagamentos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { AsaasPayment, AsaasListResponse } from '@/lib/asaas/client'
import {
  fetchPaidTransactions,
  DomCredentials,
  domDateToISO,
  domStatusToInternal,
} from '@/lib/dom/client'

const BASE_URL = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'

async function asaasGet<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    throw new Error(`Asaas ${res.status}: ${b?.errors?.[0]?.description ?? res.statusText}`)
  }
  return res.json()
}

async function fetchPaymentsByCustomer(
  apiKey: string,
  customerId: string,
  dataInicio: string,
  dataFim: string,
  hojeStr: string,
): Promise<AsaasPayment[]> {
  const queries = [
    // Recebidos no período (por paymentDate)
    `/payments?customer=${customerId}&paymentDate[ge]=${dataInicio}&paymentDate[le]=${dataFim}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`,
    // Pendentes com vencimento no período
    `/payments?customer=${customerId}&dueDate[ge]=${dataInicio}&dueDate[le]=${dataFim}&status=PENDING&limit=100`,
    // Em atraso (vencidos até hoje)
    `/payments?customer=${customerId}&dueDate[le]=${hojeStr}&status=OVERDUE&limit=100`,
  ]

  const results = await Promise.allSettled(
    queries.map(q => asaasGet<AsaasListResponse<AsaasPayment>>(q, apiKey))
  )

  const seen = new Set<string>()
  const all: AsaasPayment[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const p of r.value.data) {
        if (!seen.has(p.id)) { seen.add(p.id); all.push(p) }
      }
    }
  }
  return all
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Período
    const mesParam  = request.nextUrl.searchParams.get('mes')
    const hoje      = new Date()
    const mes       = mesParam ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const [ano, mesNum] = mes.split('-').map(Number)
    const dataInicio = `${mes}-01`
    const dataFim    = new Date(ano, mesNum, 0).toISOString().slice(0, 10)
    const hojeStr    = hoje.toISOString().slice(0, 10)

    // ── 1. API key Asaas da agência ───────────────────────────────
    // Mesma pattern das outras rotas: sem filtrar agency_id (RLS isola)
    // agency_integrations NÃO tem coluna label
    const { data: agencyInteg } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'asaas')
      .maybeSingle()

    if (!agencyInteg?.encrypted_key || agencyInteg.status !== 'active') {
      return NextResponse.json({
        resumo:              { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 },
        cobrancasPorCliente: [],
        semIdentificacao:    [],
        periodo:             { inicio: dataInicio, fim: dataFim, mes },
        fontes:              [],
        debug:               { motivo: 'sem_integracao_asaas', status: agencyInteg?.status ?? 'não encontrada' },
      })
    }

    const { api_key: apiKey } = await decrypt<{ api_key: string }>(agencyInteg.encrypted_key)

    // ── 2. Todas as integrações Asaas dos clientes ────────────────
    // Sem filtrar por status — inclui connected, error, etc.
    // credentials é JSONB direto (não criptografado)
    const { data: clientIntegs, error: ciErr } = await supabase
      .from('client_integrations')
      .select('id, credentials, label, client_id')
      .eq('type', 'asaas')

    if (ciErr) throw ciErr

    if (!clientIntegs?.length) {
      return NextResponse.json({
        resumo:              { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 },
        cobrancasPorCliente: [],
        semIdentificacao:    [],
        periodo:             { inicio: dataInicio, fim: dataFim, mes },
        fontes:              ['Asaas'],
        debug:               { motivo: 'nenhum_cliente_com_asaas' },
      })
    }

    // ── 3. Busca dados dos clientes no banco ──────────────────────
    const clientIds = [...new Set(clientIntegs.map(ci => ci.client_id).filter(Boolean))]
    const { data: clientes } = await supabase
      .from('clients')
      .select('id, name, nome_resumido')
      .in('id', clientIds)

    const clienteMap = new Map(
      (clientes ?? []).map(c => [c.id, c.nome_resumido ?? c.name])
    )

    // ── 4. Para cada customer_id, busca pagamentos no Asaas ───────
    type CobrancaItem = {
      id: string; clientId: string; clientName: string
      valorTotal:  number   // bruto (antes das taxas)
      valorLiquido: number  // líquido (o que cai na conta)
      vencimento: string; pagamento: string | null
      status: string; tipo: string; descricao: string | null
      invoiceUrl: string | null; fonte: string; contaLabel: string
      domCliente?: { nome: string; documento: string; email: string; telefone: string | null; produto: string | null } | null
    }

    const todasCobranças: CobrancaItem[] = []
    const customerIdsConhecidos = new Set<string>()

    await Promise.all(clientIntegs.map(async (ci) => {
      const creds      = ci.credentials as { customer_id?: string } | null
      const customerId = creds?.customer_id
      if (!customerId) return

      customerIdsConhecidos.add(customerId)

      const clientName = clienteMap.get(ci.client_id) ?? 'Cliente desconhecido'
      const contaLabel = ci.label ?? 'Asaas'

      try {
        const payments = await fetchPaymentsByCustomer(apiKey, customerId, dataInicio, dataFim, hojeStr)
        for (const p of payments) {
          // netValue = valor líquido Asaas; se null/0, usa value (sem desconto)
          const valorLiquido = (p.netValue && p.netValue > 0) ? p.netValue : p.value
          todasCobranças.push({
            id:           p.id,
            clientId:     ci.client_id,
            clientName,
            valorTotal:   p.value,
            valorLiquido,
            vencimento:   p.dueDate,
            pagamento:    p.paymentDate ?? null,
            status:       p.status,
            tipo:         p.billingType,
            descricao:    p.description ?? null,
            invoiceUrl:   p.invoiceUrl ?? null,
            fonte:        'asaas',
            contaLabel,
          })
        }
      } catch { /* cliente com erro no Asaas — ignora */ }
    }))

    // ── 5. Detecta recebimentos sem identificação ─────────────────
    // Agrupa por customer Asaas e busca detalhes do customer
    type CustomerSemIdent = {
      customerId:  string
      customerName: string
      cpfCnpj:     string | null
      email:       string | null
      totalValor:  number
      pagamentos:  CobrancaItem[]
    }

    let semIdentificacao: CustomerSemIdent[] = []
    try {
      const allReceived = await asaasGet<AsaasListResponse<AsaasPayment>>(
        `/payments?paymentDate[ge]=${dataInicio}&paymentDate[le]=${dataFim}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`,
        apiKey
      )

      // Filtra apenas os sem cadastro e agrupa por customer
      const semIdentMap = new Map<string, { payments: AsaasPayment[] }>()
      for (const p of allReceived.data) {
        if (!customerIdsConhecidos.has(p.customer)) {
          if (!semIdentMap.has(p.customer)) semIdentMap.set(p.customer, { payments: [] })
          semIdentMap.get(p.customer)!.payments.push(p)
        }
      }

      // Busca detalhes de cada customer em paralelo (máx 10 para não sobrecarregar)
      const customerIds = [...semIdentMap.keys()].slice(0, 20)
      const customerDetails = await Promise.all(
        customerIds.map(async id => {
          try {
            return await asaasGet<{ id: string; name: string; cpfCnpj: string | null; email: string | null }>(
              `/customers/${id}`, apiKey
            )
          } catch { return { id, name: 'Desconhecido', cpfCnpj: null, email: null } }
        })
      )

      semIdentificacao = customerDetails.map(c => {
        const group = semIdentMap.get(c.id)!
        const pagamentos = group.payments.map(p => {
          const liq = (p.netValue && p.netValue > 0) ? p.netValue : p.value
          return {
            id:           p.id,
            clientId:     '',
            clientName:   c.name,
            valorTotal:   p.value,
            valorLiquido: liq,
            vencimento:   p.dueDate,
            pagamento:    p.paymentDate ?? null,
            status:       p.status,
            tipo:         p.billingType,
            descricao:    p.description ?? null,
            invoiceUrl:   p.invoiceUrl ?? null,
            fonte:        'asaas',
            contaLabel:   'Asaas',
          }
        })
        return {
          customerId:   c.id,
          customerName: c.name,
          cpfCnpj:      c.cpfCnpj ?? null,
          email:        c.email ?? null,
          totalValor:   pagamentos.reduce((s, p) => s + p.valorLiquido, 0),
          pagamentos,
        }
      })
    } catch { /* ignora */ }

    // ── 6. Resumo e agrupamento por cliente ───────────────────────
    const STATUS_RECEBIDO = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])
    const STATUS_PREVISTO  = new Set(['PENDING'])
    const STATUS_ATRASO    = new Set(['OVERDUE'])

    const resumo = todasCobranças.reduce(
      (acc, c) => {
        // Usa valorLiquido nos acumuladores principais
        if (STATUS_RECEBIDO.has(c.status)) {
          acc.recebido        += c.valorLiquido
          acc.recebidoBruto   += c.valorTotal
        } else if (STATUS_PREVISTO.has(c.status)) {
          acc.previsto        += c.valorLiquido
          acc.previstobruto   += c.valorTotal
        } else if (STATUS_ATRASO.has(c.status)) {
          acc.emAtraso        += c.valorLiquido
          acc.emAtrasoBruto   += c.valorTotal
        }
        return acc
      },
      {
        recebido: 0, recebidoBruto: 0,
        previsto: 0, previstobruto: 0,
        emAtraso: 0, emAtrasoBruto: 0,
        semIdentificacao: 0,
      }
    )
    resumo.semIdentificacao = semIdentificacao.reduce((s, c) => s + c.totalValor, 0)

    type ClienteGroup = {
      clientId: string; clientName: string
      recebido: number; previsto: number; emAtraso: number
      cobranças: CobrancaItem[]
    }
    const porCliente = new Map<string, ClienteGroup>()
    for (const c of todasCobranças) {
      if (!porCliente.has(c.clientId)) {
        porCliente.set(c.clientId, {
          clientId: c.clientId, clientName: c.clientName,
          recebido: 0, previsto: 0, emAtraso: 0, cobranças: [],
        })
      }
      const g = porCliente.get(c.clientId)!
      g.cobranças.push(c)
      if (STATUS_RECEBIDO.has(c.status)) g.recebido      += c.valorLiquido
      else if (STATUS_PREVISTO.has(c.status)) g.previsto += c.valorLiquido
      else if (STATUS_ATRASO.has(c.status))   g.emAtraso += c.valorLiquido
    }

    // ── Dom Pagamentos ────────────────────────────────────────────
    const { data: domInteg } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    const fontes: string[] = ['Asaas']

    if (domInteg?.encrypted_key && domInteg.status === 'active') {
      try {
        const domCreds = await decrypt<DomCredentials>(domInteg.encrypted_key)

        // ── Integrações Dom por cliente (client_integrations) ─────
        // Mesmo padrão do Asaas: credentials.document = CPF/CNPJ do comprador
        const { data: domClientIntegs } = await supabase
          .from('client_integrations')
          .select('id, credentials, label, client_id')
          .eq('type', 'dom_pagamentos')

        // Busca nomes dos clientes que têm integração Dom
        const domClientIds = [
          ...new Set((domClientIntegs ?? []).map(ci => ci.client_id).filter(Boolean))
        ]
        const { data: domClientes } = domClientIds.length > 0
          ? await supabase.from('clients').select('id, name, nome_resumido').in('id', domClientIds)
          : { data: [] }

        const domClienteMap = new Map(
          (domClientes ?? []).map(c => [c.id, c.nome_resumido ?? c.name])
        )

        // Mapa: documento limpo → { clientId, clientName }
        const domDocMap = new Map<string, { clientId: string; clientName: string }>()
        for (const ci of (domClientIntegs ?? [])) {
          const doc = (ci.credentials as { document?: string })?.document?.replace(/\D/g, '')
          if (doc) {
            domDocMap.set(doc, {
              clientId:   ci.client_id,
              clientName: domClienteMap.get(ci.client_id) ?? 'Cliente',
            })
          }
        }

        // ── Busca transações pagas do período ─────────────────────
        const domTxs = await fetchPaidTransactions(domCreds, dataInicio, dataFim)
        fontes.push('Dom Pagamentos')

        for (const tx of domTxs) {
          // Ambos já em REAIS (sem divisão por 100)
          const valorTotal   = tx.amount
          const valorLiquido = tx.liquid_amount

          // Identifica cliente pelo documento vinculado em client_integrations
          const doc     = tx.customer_document?.replace(/\D/g, '')
          const matched = doc ? domDocMap.get(doc) : null

          const clientId   = matched?.clientId   ?? ''
          const clientName = matched?.clientName  ?? tx.customer_name ?? '— Sem identificação —'

          const status = domStatusToInternal(tx.status)
          const data   = domDateToISO(tx.created_at)

          const cobranca = {
            id:           `dom_${tx.id}`,
            clientId,
            clientName,
            valorTotal,
            valorLiquido,
            vencimento:   data,
            pagamento:    data,
            status,
            tipo:         tx.payment_method,
            descricao:    tx.product_first ?? null,
            invoiceUrl:   tx.boleto_url ?? null,
            fonte:        'dom',
            contaLabel:   'Dom Pagamentos',
            parcelas:     tx.installments > 1 ? `${tx.installments}x` : null,
            cartao:       tx.card_brand ?? null,
            domCliente: {
              nome:      tx.customer_name,
              documento: tx.customer_document,
              email:     tx.customer_email,
              telefone:  tx.customer_phone ?? null,
              produto:   tx.product_first  ?? null,
            },
          }

          // Agrupa pelo clientId do cliente cadastrado, ou pelo doc se sem vínculo
          const key = clientId || `__dom_${doc ?? tx.id}`
          if (!porCliente.has(key)) {
            porCliente.set(key, {
              clientId, clientName,
              recebido: 0, previsto: 0, emAtraso: 0, cobranças: [],
            })
          }
          const g = porCliente.get(key)!
          g.cobranças.push(cobranca)

          if (STATUS_RECEBIDO.has(status)) {
            g.recebido           += valorLiquido
            resumo.recebido      += valorLiquido
            resumo.recebidoBruto += valorTotal
          } else if (STATUS_PREVISTO.has(status)) {
            g.previsto            += valorLiquido
            resumo.previsto       += valorLiquido
            resumo.previstobruto  += valorTotal
          } else if (STATUS_ATRASO.has(status)) {
            g.emAtraso            += valorLiquido
            resumo.emAtraso       += valorLiquido
            resumo.emAtrasoBruto  += valorTotal
          }
        }
      } catch (domErr) {
        console.error('[financeiro] Dom Pagamentos error:', domErr)
      }
    }

    const cobrancasPorCliente = [...porCliente.values()].sort((a, b) => {
      if (a.emAtraso > 0 && b.emAtraso === 0) return -1
      if (b.emAtraso > 0 && a.emAtraso === 0) return  1
      return (b.recebido + b.previsto + b.emAtraso) - (a.recebido + a.previsto + a.emAtraso)
    })

    return NextResponse.json({
      resumo,
      cobrancasPorCliente,
      semIdentificacao,
      periodo: { inicio: dataInicio, fim: dataFim, mes },
      fontes,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
