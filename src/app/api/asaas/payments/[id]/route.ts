import { toErrorMsg } from '@/lib/utils'
/**
 * PATCH /api/asaas/payments/[id]  — atualiza valor e/ou data de vencimento
 * DELETE /api/asaas/payments/[id] — cancela (cancela cobrança pendente/vencida no Asaas)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { updatePayment, cancelPayment } from '@/lib/asaas/client'

async function getApiKey() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: 'Não autenticado', status: 401 }

  const { data: integ } = await supabase
    .from('agency_integrations').select('encrypted_key, status').eq('type', 'asaas').single()
  if (!integ?.encrypted_key || integ.status !== 'active')
    return { error: 'Integração Asaas não configurada', status: 404 }

  const { api_key } = await decrypt<{ api_key: string }>(integ.encrypted_key)
  return { apiKey: api_key }
}

// PATCH — atualiza value e/ou dueDate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const auth = await getApiKey()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const { value, dueDate, description } = body

    if (!value && !dueDate && !description)
      return NextResponse.json({ error: 'Informe ao menos um campo para atualizar' }, { status: 400 })

    const payment = await updatePayment(auth.apiKey, id, { value, dueDate, description })
    return NextResponse.json({ payment })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error(`[PATCH /api/asaas/payments/${id}]`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — cancela cobrança
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const auth = await getApiKey()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const result = await cancelPayment(auth.apiKey, id)
    return NextResponse.json({ deleted: result.deleted ?? true })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error(`[DELETE /api/asaas/payments/${id}]`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
