import { toErrorMsg } from '@/lib/utils'
/**
 * POST /api/asaas/payments/batch
 * Cria múltiplas cobranças avulsas em paralelo (para lançamentos futuros periódicos)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { createPayment } from '@/lib/asaas/client'

interface PaymentItem {
  customer:    string
  billingType: string
  value:       number
  dueDate:     string
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: integration } = await supabase
      .from('agency_integrations').select('encrypted_key, status').eq('type', 'asaas').single()
    if (!integration?.encrypted_key || integration.status !== 'active')
      return NextResponse.json({ error: 'Integração Asaas não configurada ou inativa' }, { status: 404 })

    const creds  = await decrypt<{ api_key: string }>(integration.encrypted_key)
    const body   = await request.json()
    const { payments } = body as { payments: PaymentItem[] }

    if (!Array.isArray(payments) || payments.length === 0)
      return NextResponse.json({ error: 'Nenhuma cobrança informada' }, { status: 400 })
    if (payments.length > 120)
      return NextResponse.json({ error: 'Máximo de 120 cobranças por lançamento' }, { status: 400 })

    // Cria em paralelo (lotes de 5 para não sobrecarregar a API do Asaas)
    const results: { ok: boolean; dueDate: string; id?: string; error?: string }[] = []
    const batchSize = 5
    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize)
      const settled = await Promise.allSettled(
        batch.map(p => createPayment(creds.api_key, {
          customer:    p.customer,
          billingType: p.billingType as 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED',
          value:       p.value,
          dueDate:     p.dueDate,
          description: p.description,
        }))
      )
      settled.forEach((r, idx) => {
        const dueDate = batch[idx].dueDate
        if (r.status === 'fulfilled') results.push({ ok: true, dueDate, id: r.value.id })
        else results.push({ ok: false, dueDate, error: r.reason?.message ?? 'Erro' })
      })
    }

    const created = results.filter(r => r.ok).length
    const failed  = results.filter(r => !r.ok).length
    return NextResponse.json({ created, failed, results })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[POST /api/asaas/payments/batch]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
