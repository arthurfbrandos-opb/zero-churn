/**
 * GET /api/financeiro?mes=2026-02
 *
 * Agrega dados financeiros de TODOS os clientes da agência.
 * Fonte atual: Asaas. Dom Pagamentos será adicionado como segunda fonte.
 *
 * Estratégia:
 *  1. Pega a API key Asaas da agência (agency_integrations — criptografado)
 *  2. Pega todos os client_integrations tipo 'asaas' da agência (credentials é JSONB, não criptografado)
 *  3. Para cada cliente/customer_id, busca pagamentos no Asaas
 *  4. Cruza com os clientes cadastrados para detectar "sem identificação"
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { AsaasPayment, AsaasListResponse } from '@/lib/asaas/client'

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
  hoje: string,
): Promise<AsaasPayment[]> {
  const all: AsaasPayment[] = []

  const queries = [
    // Recebidos no período (por paymentDate)
    `/payments?customer=${customerId}&paymentDate[ge]=${dataInicio}&paymentDate[le]=${dataFim}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`,
    // Pendentes com vencimento no período
    `/payments?customer=${customerId}&dueDate[ge]=${dataInicio}&dueDate[le]=${dataFim}&status=PENDING&limit=100`,
    // Em atraso (todos os vencidos até hoje)
    `/payments?customer=${customerId}&dueDate[le]=${hoje}&status=OVERDUE&limit=100`,
  ]

  const results = await Promise.allSettled(
    queries.map(q => asaasGet<AsaasListResponse<AsaasPayment>>(q, apiKey))
  )

  const seen = new Set<string>()
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const p of r.value.data) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          all.push(p)
        }
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

    // Agência do usuário
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const agencyId = agencyUser.agency_id

    // Período
    const mesParam = request.nextUrl.searchParams.get('mes')
    const hoje = new Date()
    const mes  = mesParam ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const [ano, mesNum] = mes.split('-').map(Number)
    const dataInicio = `${mes}-01`
    const dataFim    = new Date(ano, mesNum, 0).toISOString().slice(0, 10)
    const hojeStr    = hoje.toISOString().slice(0, 10)

    // ── 1. API key Asaas da agência (criptografada) ──────────────
    const { data: agencyInteg } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status, label')
      .eq('agency_id', agencyId)
      .eq('type', 'asaas')
      .eq('status', 'active')
      .maybeSingle()

    if (!agencyInteg?.encrypted_key) {
      return NextResponse.json({
        resumo:              { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 },
        cobrancasPorCliente: [],
        semIdentificacao:    [],
        periodo:             { inicio: dataInicio, fim: dataFim, mes },
        fontes:              [],
      })
    }

    const { api_key: apiKey } = await decrypt<{ api_key: string }>(agencyInteg.encrypted_key)
    const contaLabel = agencyInteg.label ?? 'Asaas'

    // ── 2. Todos os client_integrations Asaas da agência ─────────
    // credentials é JSONB (não criptografado) — acesso direto
    const { data: clientIntegs } = await supabase
      .from('client_integrations')
      .select(`
        id,
        credentials,
        label,
        status,
        client_id,
        clients(id, name, nome_resumido, status)
      `)
      .eq('agency_id', agencyId)
      .eq('type', 'asaas')
      .eq('status', 'connected')

    if (!clientIntegs?.length) {
      return NextResponse.json({
        resumo:              { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 },
        cobrancasPorCliente: [],
        semIdentificacao:    [],
        periodo:             { inicio: dataInicio, fim: dataFim, mes },
        fontes:              [contaLabel],
      })
    }

    // ── 3. Para cada cliente/customer_id, busca pagamentos ────────
    type CobrancaItem = {
      id:         string
      clientId:   string
      clientName: string
      valor:      number
      vencimento: string
      pagamento:  string | null
      status:     string
      tipo:       string
      descricao:  string | null
      invoiceUrl: string | null
      fonte:      string
      contaLabel: string
    }

    const todasCobranças: CobrancaItem[] = []

    await Promise.all(clientIntegs.map(async (ci) => {
      const creds = ci.credentials as { customer_id?: string } | null
      const customerId = creds?.customer_id
      if (!customerId) return

      const client = ci.clients as unknown as { id: string; name: string; nome_resumido: string | null } | null
      if (!client) return

      const clientName = client.nome_resumido ?? client.name

      try {
        const payments = await fetchPaymentsByCustomer(
          apiKey, customerId, dataInicio, dataFim, hojeStr
        )

        for (const p of payments) {
          todasCobranças.push({
            id:         p.id,
            clientId:   client.id,
            clientName,
            valor:      p.value,
            vencimento: p.dueDate,
            pagamento:  p.paymentDate ?? null,
            status:     p.status,
            tipo:       p.billingType,
            descricao:  p.description ?? null,
            invoiceUrl: p.invoiceUrl ?? null,
            fonte:      'asaas',
            contaLabel,
          })
        }
      } catch { /* cliente com erro no Asaas — ignora, não trava os outros */ }
    }))

    // ── 4. Detectar pagamentos sem identificação ──────────────────
    // Busca todos os pagamentos recebidos no período na conta inteira
    // que NÃO pertencem a nenhum customer_id cadastrado
    const customerIdsConhecidos = new Set(
      clientIntegs
        .map(ci => (ci.credentials as { customer_id?: string } | null)?.customer_id)
        .filter(Boolean) as string[]
    )

    let semIdentificacao: CobrancaItem[] = []
    try {
      const allReceived = await asaasGet<AsaasListResponse<AsaasPayment>>(
        `/payments?paymentDate[ge]=${dataInicio}&paymentDate[le]=${dataFim}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`,
        apiKey
      )
      semIdentificacao = allReceived.data
        .filter(p => !customerIdsConhecidos.has(p.customer))
        .map(p => ({
          id:         p.id,
          clientId:   '',
          clientName: '— Sem identificação —',
          valor:      p.value,
          vencimento: p.dueDate,
          pagamento:  p.paymentDate ?? null,
          status:     p.status,
          tipo:       p.billingType,
          descricao:  p.description ?? null,
          invoiceUrl: p.invoiceUrl ?? null,
          fonte:      'asaas',
          contaLabel,
        }))
    } catch { /* ignora erro no fetch geral — sem ident não crítico */ }

    // ── 5. Resumo ─────────────────────────────────────────────────
    const STATUS_RECEBIDO = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])
    const STATUS_PREVISTO  = new Set(['PENDING'])
    const STATUS_ATRASO    = new Set(['OVERDUE'])

    const resumo = todasCobranças.reduce(
      (acc, c) => {
        if (STATUS_RECEBIDO.has(c.status)) acc.recebido      += c.valor
        else if (STATUS_PREVISTO.has(c.status)) acc.previsto += c.valor
        else if (STATUS_ATRASO.has(c.status))   acc.emAtraso += c.valor
        return acc
      },
      { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 }
    )
    resumo.semIdentificacao = semIdentificacao.reduce((s, c) => s + c.valor, 0)

    // ── 6. Agrupa por cliente ─────────────────────────────────────
    type ClienteGroup = {
      clientId:   string
      clientName: string
      recebido:   number
      previsto:   number
      emAtraso:   number
      cobranças:  CobrancaItem[]
    }

    const porCliente = new Map<string, ClienteGroup>()
    for (const c of todasCobranças) {
      if (!porCliente.has(c.clientId)) {
        porCliente.set(c.clientId, {
          clientId:   c.clientId,
          clientName: c.clientName,
          recebido:   0, previsto: 0, emAtraso: 0,
          cobranças:  [],
        })
      }
      const g = porCliente.get(c.clientId)!
      g.cobranças.push(c)
      if (STATUS_RECEBIDO.has(c.status)) g.recebido      += c.valor
      else if (STATUS_PREVISTO.has(c.status)) g.previsto += c.valor
      else if (STATUS_ATRASO.has(c.status))   g.emAtraso += c.valor
    }

    const cobrancasPorCliente = [...porCliente.values()].sort((a, b) => {
      if (a.emAtraso > 0 && b.emAtraso === 0) return -1
      if (b.emAtraso > 0 && a.emAtraso === 0) return  1
      return (b.recebido + b.previsto + b.emAtraso) - (a.recebido + a.previsto + a.emAtraso)
    })

    return NextResponse.json({
      resumo,
      cobrancasPorCliente,
      semIdentificacao: semIdentificacao.slice(0, 50),
      periodo:          { inicio: dataInicio, fim: dataFim, mes },
      fontes:           [contaLabel],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
