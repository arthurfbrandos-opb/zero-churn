/**
 * GET  /api/clients/[id]/forms — lista histórico de tokens + respostas
 * POST /api/clients/[id]/forms — gera novo token de formulário
 *
 * Autenticada — usa RLS via cookie de sessão.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── GET ───────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const supabase = await createClient()

  // Valida sessão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Busca tokens + submission (se houver)
  const { data, error } = await supabase
    .from('form_tokens')
    .select(`
      id,
      token,
      sent_at,
      expires_at,
      responded_at,
      sent_via,
      form_submissions (
        id,
        nps_score,
        score_resultado,
        comment,
        submitted_at
      )
    `)
    .eq('client_id', clientId)
    .order('sent_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[clients/forms GET]', error)
    return NextResponse.json({ error: 'Erro ao buscar formulários' }, { status: 500 })
  }

  // Formata resposta
  const forms = (data ?? []).map(ft => {
    const sub = Array.isArray(ft.form_submissions) ? ft.form_submissions[0] : ft.form_submissions
    const now = new Date()
    const expired = ft.expires_at ? new Date(ft.expires_at) < now : false

    let status: 'responded' | 'pending' | 'expired'
    if (ft.responded_at)         status = 'responded'
    else if (expired)            status = 'expired'
    else                         status = 'pending'

    const sentAt = ft.sent_at
    const respondedAt = ft.responded_at
    let daysToRespond: number | null = null
    if (sentAt && respondedAt) {
      daysToRespond = Math.ceil(
        (new Date(respondedAt).getTime() - new Date(sentAt).getTime()) / 86400000
      )
    }

    return {
      id:             ft.id,
      token:          ft.token,
      sentAt,
      expiresAt:      ft.expires_at,
      respondedAt,
      sentVia:        ft.sent_via,
      status,
      expired,
      daysToRespond,
      npsScore:       sub?.nps_score       ?? null,
      scoreResultado: sub?.score_resultado  ?? null,
      comment:        sub?.comment          ?? null,
      submittedAt:    sub?.submitted_at     ?? null,
    }
  })

  return NextResponse.json({ forms })
}

// ── POST ──────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const supabase = await createClient()

  // Valida sessão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Busca agency_id do usuário
  const { data: au } = await supabase
    .from('agency_users')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!au?.agency_id) {
    return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
  }

  // Confirma que o cliente pertence a esta agência
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('agency_id', au.agency_id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  // Parse body opcional
  let sentVia: string | null = null
  try {
    const body = await req.json()
    sentVia = body.sentVia ?? null
  } catch { /* body vazio é ok */ }

  // Cria o token (o DEFAULT do banco gera o hex token e a expiração em 30d)
  const { data: ft, error } = await supabase
    .from('form_tokens')
    .insert({
      client_id:  clientId,
      agency_id:  au.agency_id,
      sent_via:   sentVia ?? 'manual',
    })
    .select('id, token, sent_at, expires_at')
    .single()

  if (error) {
    console.error('[clients/forms POST]', error)
    return NextResponse.json({ error: 'Erro ao gerar formulário' }, { status: 500 })
  }

  return NextResponse.json({
    id:        ft.id,
    token:     ft.token,
    sentAt:    ft.sent_at,
    expiresAt: ft.expires_at,
    url:       `${process.env.NEXT_PUBLIC_APP_URL}/f/${ft.token}`,
  }, { status: 201 })
}
