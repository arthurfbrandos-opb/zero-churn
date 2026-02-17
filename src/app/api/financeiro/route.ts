/**
 * GET /api/financeiro?mes=2026-02
 *
 * Agrega dados financeiros de TODOS os clientes da agência.
 * Fonte atual: Asaas. Dom Pagamentos será adicionado como segunda fonte.
 *
 * Retorna:
 *  - resumo: { recebido, previsto, emAtraso, semIdentificacao }
 *  - cobranças por cliente (paginadas)
 *  - recebimentos sem identificação (customer Asaas sem cliente no Zero Churn)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import {
  AsaasPayment,
  AsaasListResponse,
} from '@/lib/asaas/client'

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

/** Busca todos os pagamentos de um período via paginação */
async function fetchAllPayments(apiKey: string, filters: string): Promise<AsaasPayment[]> {
  const all: AsaasPayment[] = []
  let offset = 0
  let hasMore = true

  while (hasMore && offset < 2000) {
    const res = await asaasGet<AsaasListResponse<AsaasPayment>>(
      `/payments?${filters}&limit=100&offset=${offset}`,
      apiKey
    )
    all.push(...res.data)
    hasMore = res.hasMore
    offset += 100
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

    // Período: padrão = mês atual
    const mesParam = request.nextUrl.searchParams.get('mes') // formato YYYY-MM
    const hoje = new Date()
    const mes = mesParam ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const [ano, mesNum] = mes.split('-').map(Number)
    const dataInicio = `${mes}-01`
    const dataFim    = new Date(ano, mesNum, 0).toISOString().slice(0, 10) // último dia do mês

    // ── Busca integrações Asaas da agência (pode ter múltiplas contas) ──────
    const { data: agencyIntegs } = await supabase
      .from('agency_integrations')
      .select('id, encrypted_key, label, status')
      .eq('agency_id', agencyId)
      .eq('type', 'asaas')
      .eq('status', 'active')

    if (!agencyIntegs?.length) {
      return NextResponse.json({
        resumo:              { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 },
        cobrancasPorCliente: [],
        semIdentificacao:    [],
        periodo:             { inicio: dataInicio, fim: dataFim, mes },
        fontes:              [],
      })
    }

    // ── Busca clientes com integração Asaas para cruzar customer_ids ────────
    const { data: clientIntegs } = await supabase
      .from('client_integrations')
      .select(`
        id, credentials, label,
        clients!inner(id, name, nome_resumido, status)
      `)
      .eq('type', 'asaas')
      .eq('clients.agency_id', agencyId)

    // Mapa: asaas_customer_id → { clientId, clientName }
    type ClientInfo = { clientId: string; clientName: string }
    const customerMap = new Map<string, ClientInfo>()

    for (const ci of clientIntegs ?? []) {
      try {
        const creds = await decrypt<{ customer_id: string }>(ci.credentials)
        if (creds.customer_id) {
          const c = ci.clients as unknown as { id: string; name: string; nome_resumido: string | null }
          customerMap.set(creds.customer_id, {
            clientId:   c.id,
            clientName: c.nome_resumido ?? c.name,
          })
        }
      } catch { /* ignora credenciais inválidas */ }
    }

    // ── Para cada conta Asaas, busca pagamentos do período ──────────────────
    type CobrancaItem = {
      id: string
      clientId:   string | null
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
    const semIdent: CobrancaItem[]        = []
    const fontesAtivas: string[]          = []

    await Promise.all(agencyIntegs.map(async (integ) => {
      try {
        const { api_key: apiKey } = await decrypt<{ api_key: string }>(integ.encrypted_key)
        const contaLabel = integ.label ?? 'Asaas'
        fontesAtivas.push(contaLabel)

        // Pagamentos do período (por dueDate)
        const [recebidos, pendentes, vencidos] = await Promise.all([
          fetchAllPayments(apiKey,
            `paymentDate[ge]=${dataInicio}&paymentDate[le]=${dataFim}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH`
          ),
          fetchAllPayments(apiKey,
            `dueDate[ge]=${dataInicio}&dueDate[le]=${dataFim}&status=PENDING`
          ),
          fetchAllPayments(apiKey,
            `dueDate[le]=${hoje.toISOString().slice(0, 10)}&status=OVERDUE`
          ),
        ])

        const todos = [
          ...recebidos.map(p => ({ ...p, _grupo: 'recebido' as const })),
          ...pendentes.map(p => ({ ...p, _grupo: 'previsto' as const })),
          ...vencidos.map(p =>  ({ ...p, _grupo: 'emAtraso' as const })),
        ]

        for (const p of todos) {
          const clientInfo = customerMap.get(p.customer) ?? null
          const item: CobrancaItem = {
            id:         p.id,
            clientId:   clientInfo?.clientId   ?? null,
            clientName: clientInfo?.clientName ?? '— Sem identificação —',
            valor:      p.value,
            vencimento: p.dueDate,
            pagamento:  p.paymentDate ?? null,
            status:     p.status,
            tipo:       p.billingType,
            descricao:  p.description ?? null,
            invoiceUrl: p.invoiceUrl ?? null,
            fonte:      'asaas',
            contaLabel,
          }
          todasCobranças.push(item)
          if (!clientInfo) semIdent.push(item)
        }
      } catch { /* conta com erro — ignora e continua */ }
    }))

    // ── Cálculo do resumo ────────────────────────────────────────────────────
    const STATUS_RECEBIDO = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])
    const STATUS_PREVISTO  = new Set(['PENDING'])
    const STATUS_ATRASO    = new Set(['OVERDUE'])

    const resumo = todasCobranças.reduce(
      (acc, c) => {
        if (STATUS_RECEBIDO.has(c.status)) acc.recebido         += c.valor
        else if (STATUS_PREVISTO.has(c.status)) acc.previsto    += c.valor
        else if (STATUS_ATRASO.has(c.status))   acc.emAtraso    += c.valor
        if (!c.clientId) acc.semIdentificacao += c.valor
        return acc
      },
      { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 }
    )

    // ── Agrupa por cliente para a tabela ─────────────────────────────────────
    type ClienteGroup = {
      clientId:   string | null
      clientName: string
      recebido:   number
      previsto:   number
      emAtraso:   number
      cobranças:  CobrancaItem[]
    }

    const porCliente = new Map<string, ClienteGroup>()
    for (const c of todasCobranças) {
      const key = c.clientId ?? `__noident__${c.clientName}`
      if (!porCliente.has(key)) {
        porCliente.set(key, {
          clientId:   c.clientId,
          clientName: c.clientName,
          recebido:   0,
          previsto:   0,
          emAtraso:   0,
          cobranças:  [],
        })
      }
      const g = porCliente.get(key)!
      g.cobranças.push(c)
      if (STATUS_RECEBIDO.has(c.status)) g.recebido += c.valor
      else if (STATUS_PREVISTO.has(c.status)) g.previsto += c.valor
      else if (STATUS_ATRASO.has(c.status))   g.emAtraso += c.valor
    }

    // Ordena: inadimplentes primeiro, depois por valor total desc
    const cobrancasPorCliente = [...porCliente.values()].sort((a, b) => {
      if (a.emAtraso > 0 && b.emAtraso === 0) return -1
      if (b.emAtraso > 0 && a.emAtraso === 0) return  1
      return (b.recebido + b.previsto + b.emAtraso) - (a.recebido + a.previsto + a.emAtraso)
    })

    return NextResponse.json({
      resumo,
      cobrancasPorCliente,
      semIdentificacao: semIdent.slice(0, 50), // primeiros 50
      periodo: { inicio: dataInicio, fim: dataFim, mes },
      fontes:  fontesAtivas,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
