/**
 * GET /api/financeiro?mes=2026-02
 *
 * Agrega dados financeiros — Asaas + Dom Pagamentos.
 * Qualquer uma das fontes pode estar ausente — a outra ainda funciona.
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

const ASAAS_BASE = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'

// ── Helpers Asaas ─────────────────────────────────────────────────

async function asaasGet<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
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
  apiKey: string, customerId: string,
  dataInicio: string, dataFim: string, hojeStr: string,
): Promise<AsaasPayment[]> {
  // OVERDUE: escopa ao período (dueDate dentro do range, até hoje no máximo)
  const maxFim = dataFim < hojeStr ? dataFim : hojeStr
  const queries = [
    `/payments?customer=${customerId}&paymentDate[ge]=${dataInicio}&paymentDate[le]=${dataFim}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`,
    `/payments?customer=${customerId}&dueDate[ge]=${dataInicio}&dueDate[le]=${dataFim}&status=PENDING&limit=100`,
    `/payments?customer=${customerId}&dueDate[ge]=${dataInicio}&dueDate[le]=${maxFim}&status=OVERDUE&limit=100`,
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

// ── Tipos compartilhados ──────────────────────────────────────────

type CobrancaItem = {
  id:           string
  clientId:     string
  clientName:   string
  valorTotal:   number    // bruto
  valorLiquido: number    // líquido (após taxas)
  vencimento:   string
  pagamento:    string | null
  status:       string
  tipo:         string
  descricao:    string | null
  invoiceUrl:   string | null
  fonte:        'asaas' | 'dom'
  contaLabel:   string
  parcelas?:    string | null
  cartao?:      string | null
  domCliente?:  {
    nome: string; documento: string; email: string
    telefone: string | null; produto: string | null
  } | null
}

type CustomerSemIdent = {
  customerId:   string
  customerName: string
  cpfCnpj:      string | null
  email:        string | null
  totalValor:   number
  pagamentos:   CobrancaItem[]
  fonte:        'asaas' | 'dom'
}

type ClienteGroup = {
  clientId:   string
  clientName: string
  recebido:   number
  previsto:   number
  emAtraso:   number
  cobranças:  CobrancaItem[]
}

type Resumo = {
  recebido:        number; recebidoBruto:  number
  previsto:        number; previstobruto:  number
  emAtraso:        number; emAtrasoBruto:  number
  semIdentificacao: number
}

const STATUS_RECEBIDO = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])
const STATUS_PREVISTO  = new Set(['PENDING'])
const STATUS_ATRASO    = new Set(['OVERDUE'])

function acumularResumo(r: Resumo, status: string, liq: number, bruto: number) {
  if (STATUS_RECEBIDO.has(status)) { r.recebido += liq; r.recebidoBruto += bruto }
  else if (STATUS_PREVISTO.has(status)) { r.previsto += liq; r.previstobruto += bruto }
  else if (STATUS_ATRASO.has(status))   { r.emAtraso += liq; r.emAtrasoBruto += bruto }
}

function addToGrupo(
  porCliente: Map<string, ClienteGroup>,
  key: string, clientId: string, clientName: string,
  cobranca: CobrancaItem
) {
  // Guard: nunca criar grupo com chave vazia (causaria merge indevido)
  if (!key) return
  if (!porCliente.has(key)) {
    porCliente.set(key, { clientId, clientName, recebido: 0, previsto: 0, emAtraso: 0, cobranças: [] })
  }
  const g = porCliente.get(key)!
  g.cobranças.push(cobranca)
  if (STATUS_RECEBIDO.has(cobranca.status)) g.recebido      += cobranca.valorLiquido
  else if (STATUS_PREVISTO.has(cobranca.status)) g.previsto += cobranca.valorLiquido
  else if (STATUS_ATRASO.has(cobranca.status))   g.emAtraso += cobranca.valorLiquido
}

// ── Handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Período: suporta ?mes=YYYY-MM (legado) OU ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
    const mesParam    = request.nextUrl.searchParams.get('mes')
    const inicioParam = request.nextUrl.searchParams.get('inicio')
    const fimParam    = request.nextUrl.searchParams.get('fim')
    const hoje        = new Date()
    const hojeStr     = hoje.toISOString().slice(0, 10)
    let dataInicio: string
    let dataFim: string
    let mes: string
    if (inicioParam && fimParam) {
      dataInicio = inicioParam
      dataFim    = fimParam
      mes        = inicioParam.slice(0, 7)
    } else {
      mes        = mesParam ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
      const [ano, mesNum] = mes.split('-').map(Number)
      dataInicio = `${mes}-01`
      dataFim    = new Date(ano, mesNum, 0).toISOString().slice(0, 10)
    }

    const resumo: Resumo = {
      recebido: 0, recebidoBruto: 0,
      previsto: 0, previstobruto: 0,
      emAtraso: 0, emAtrasoBruto: 0,
      semIdentificacao: 0,
    }
    const porCliente     = new Map<string, ClienteGroup>()
    const semIdentificacao: CustomerSemIdent[] = []
    const fontes: string[] = []

    // ── Integração Asaas da agência ───────────────────────────────
    const { data: asaasInteg } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'asaas')
      .maybeSingle()

    const asaasAtivo = !!(asaasInteg?.encrypted_key && asaasInteg.status === 'active')

    if (asaasAtivo) {
      try {
        const { api_key: apiKey } = await decrypt<{ api_key: string }>(asaasInteg!.encrypted_key)
        fontes.push('Asaas')

        // ── Client integrations Asaas ─────────────────────────────
        const { data: clientIntegs } = await supabase
          .from('client_integrations')
          .select('id, credentials, label, client_id')
          .eq('type', 'asaas')

        // Mapa de nomes
        const clientIds = [...new Set((clientIntegs ?? []).map(ci => ci.client_id).filter(Boolean))]
        const { data: clientes } = clientIds.length > 0
          ? await supabase.from('clients').select('id, name, nome_resumido').in('id', clientIds)
          : { data: [] }
        const clienteMap = new Map((clientes ?? []).map(c => [c.id, c.nome_resumido ?? c.name]))

        // Rastreia customer_ids para detectar sem-identificação
        const customerIdsConhecidos = new Set<string>()
        // Dedup: mesmo customer_id vinculado a 2 clientes → processa só uma vez
        const customerIdVisto = new Set<string>()

        await Promise.all((clientIntegs ?? []).map(async (ci) => {
          const creds      = ci.credentials as { customer_id?: string } | null
          const customerId = creds?.customer_id
          if (!customerId) return
          customerIdsConhecidos.add(customerId)

          // BUG #4 fix: se mesmo customer_id já foi processado (ligado a outro cliente),
          // registra no segundo cliente mas não busca pagamentos de novo (evita double count).
          const jaProcessado = customerIdVisto.has(customerId)
          customerIdVisto.add(customerId)
          if (jaProcessado) return

          const clientName = clienteMap.get(ci.client_id) ?? 'Cliente desconhecido'
          const contaLabel = ci.label ?? 'Asaas'

          try {
            const payments = await fetchPaymentsByCustomer(apiKey, customerId, dataInicio, dataFim, hojeStr)
            for (const p of payments) {
              const valorLiquido = (p.netValue && p.netValue > 0) ? p.netValue : p.value
              const cobranca: CobrancaItem = {
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
              }
              addToGrupo(porCliente, ci.client_id, ci.client_id, clientName, cobranca)
              acumularResumo(resumo, p.status, valorLiquido, p.value)
            }
          } catch { /* cliente com erro no Asaas — ignora */ }
        }))

        // ── Recebimentos sem identificação (Asaas) ────────────────
        try {
          const allReceived = await asaasGet<AsaasListResponse<AsaasPayment>>(
            `/payments?paymentDate[ge]=${dataInicio}&paymentDate[le]=${dataFim}&status=RECEIVED,CONFIRMED,RECEIVED_IN_CASH&limit=100`,
            apiKey
          )
          const semIdentMap = new Map<string, { payments: AsaasPayment[] }>()
          for (const p of allReceived.data) {
            if (!customerIdsConhecidos.has(p.customer)) {
              if (!semIdentMap.has(p.customer)) semIdentMap.set(p.customer, { payments: [] })
              semIdentMap.get(p.customer)!.payments.push(p)
            }
          }
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
          for (const c of customerDetails) {
            const group = semIdentMap.get(c.id)!
            const pagamentos = group.payments.map(p => {
              const liq = (p.netValue && p.netValue > 0) ? p.netValue : p.value
              return {
                id: p.id, clientId: '', clientName: c.name,
                valorTotal: p.value, valorLiquido: liq,
                vencimento: p.dueDate, pagamento: p.paymentDate ?? null,
                status: p.status, tipo: p.billingType,
                descricao: p.description ?? null, invoiceUrl: p.invoiceUrl ?? null,
                fonte: 'asaas' as const, contaLabel: 'Asaas',
              }
            })
            const total = pagamentos.reduce((s, p) => s + p.valorLiquido, 0)
            semIdentificacao.push({
              customerId: c.id, customerName: c.name,
              cpfCnpj: c.cpfCnpj ?? null, email: c.email ?? null,
              totalValor: total, pagamentos, fonte: 'asaas',
            })
            resumo.semIdentificacao += total
          }
        } catch { /* ignora erros na detecção sem-ident */ }
      } catch (asaasErr) {
        console.error('[financeiro] Asaas error:', asaasErr)
      }
    }

    // ── Integração Dom Pagamentos ─────────────────────────────────
    const { data: domInteg } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('type', 'dom_pagamentos')
      .maybeSingle()

    const domAtivo = !!(domInteg?.encrypted_key && domInteg.status === 'active')

    if (domAtivo) {
      try {
        const domCreds = await decrypt<DomCredentials>(domInteg!.encrypted_key)
        fontes.push('Dom Pagamentos')

        // ── Client integrations Dom ───────────────────────────────
        const { data: domClientIntegs } = await supabase
          .from('client_integrations')
          .select('id, credentials, label, client_id')
          .eq('type', 'dom_pagamentos')

        const domClientIds = [...new Set((domClientIntegs ?? []).map(ci => ci.client_id).filter(Boolean))]
        const { data: domClientes } = domClientIds.length > 0
          ? await supabase.from('clients').select('id, name, nome_resumido').in('id', domClientIds)
          : { data: [] }
        const domClienteMap = new Map((domClientes ?? []).map(c => [c.id, c.nome_resumido ?? c.name]))

        // BUG #3 fix: se mesmo documento está em 2 clientes, last-write-wins → log de aviso
        const domDocMap = new Map<string, { clientId: string; clientName: string }>()
        const docConflitos = new Set<string>()
        for (const ci of (domClientIntegs ?? [])) {
          const doc = (ci.credentials as { document?: string })?.document?.replace(/\D/g, '')
          if (!doc) continue
          if (domDocMap.has(doc)) {
            docConflitos.add(doc)
            console.warn(`[financeiro] Dom: documento ${doc} vinculado a múltiplos clientes`)
          }
          domDocMap.set(doc, {
            clientId:   ci.client_id,
            clientName: domClienteMap.get(ci.client_id) ?? 'Cliente',
          })
        }

        // ── Transações Dom do período ─────────────────────────────
        const domTxs = await fetchPaidTransactions(domCreds, dataInicio, dataFim)
        const domSemIdMap = new Map<string, typeof domTxs>()

        for (const tx of domTxs) {
          const valorTotal   = tx.amount
          const valorLiquido = tx.liquid_amount
          const doc          = tx.customer_document?.replace(/\D/g, '')
          const matched      = doc ? domDocMap.get(doc) : null
          const status       = domStatusToInternal(tx.status)
          const data         = domDateToISO(tx.created_at)

          const cobranca: CobrancaItem = {
            id:           `dom_${tx.id}`,
            clientId:     matched?.clientId ?? '',
            clientName:   matched?.clientName ?? tx.customer_name ?? '— Sem identificação —',
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

          if (matched) {
            // Identificado: entra no grupo do cliente
            addToGrupo(porCliente, matched.clientId, matched.clientId, matched.clientName, cobranca)
            acumularResumo(resumo, status, valorLiquido, valorTotal)
          } else {
            // Não identificado: agrupa para semIdentificacao
            const groupKey = (doc && !docConflitos.has(doc)) ? doc : `noDoc_${tx.id}`
            if (!domSemIdMap.has(groupKey)) domSemIdMap.set(groupKey, [])
            domSemIdMap.get(groupKey)!.push(tx)
          }
        }

        // Monta semIdentificacao Dom
        for (const [doc, txs] of domSemIdMap) {
          const first = txs[0]
          const pagamentos: CobrancaItem[] = txs.map(tx => {
            const s = domStatusToInternal(tx.status)
            const d = domDateToISO(tx.created_at)
            return {
              id: `dom_${tx.id}`, clientId: '', clientName: tx.customer_name ?? '—',
              valorTotal: tx.amount, valorLiquido: tx.liquid_amount,
              vencimento: d, pagamento: d, status: s,
              tipo: tx.payment_method, descricao: tx.product_first ?? null,
              invoiceUrl: tx.boleto_url ?? null,
              fonte: 'dom' as const, contaLabel: 'Dom Pagamentos',
              parcelas: tx.installments > 1 ? `${tx.installments}x` : null,
              cartao: tx.card_brand ?? null,
              domCliente: {
                nome: tx.customer_name, documento: tx.customer_document,
                email: tx.customer_email, telefone: tx.customer_phone ?? null,
                produto: tx.product_first ?? null,
              },
            }
          })
          const total = pagamentos.reduce((s, p) => s + p.valorLiquido, 0)
          semIdentificacao.push({
            customerId: doc, customerName: first.customer_name ?? '—',
            cpfCnpj: first.customer_document ?? null, email: first.customer_email ?? null,
            totalValor: total, pagamentos, fonte: 'dom',
          })
          resumo.semIdentificacao += total
        }
      } catch (domErr) {
        console.error('[financeiro] Dom Pagamentos error:', domErr)
      }
    }

    // ── Nenhuma fonte ativa ───────────────────────────────────────
    if (fontes.length === 0) {
      return NextResponse.json({
        resumo, cobrancasPorCliente: [], semIdentificacao: [],
        periodo: { inicio: dataInicio, fim: dataFim, mes },
        fontes: [],
        debug: { motivo: 'nenhuma_integracao_ativa' },
      })
    }

    // ── Ordenação final ───────────────────────────────────────────
    const cobrancasPorCliente = [...porCliente.values()].sort((a, b) => {
      if (a.emAtraso > 0 && b.emAtraso === 0) return -1
      if (b.emAtraso > 0 && a.emAtraso === 0) return  1
      return (b.recebido + b.previsto + b.emAtraso) - (a.recebido + a.previsto + a.emAtraso)
    })

    return NextResponse.json({
      resumo, cobrancasPorCliente, semIdentificacao,
      periodo: { inicio: dataInicio, fim: dataFim, mes },
      fontes,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
