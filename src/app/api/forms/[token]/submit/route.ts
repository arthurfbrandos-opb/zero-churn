/**
 * POST /api/forms/[token]/submit
 *
 * Rota pública (sem auth) — salva resposta do formulário de satisfação.
 * Body: { npsScore: number, scoreResultado: number, comment?: string }
 *
 * Usa service role para inserir via bypass de RLS (o cliente final
 * não está autenticado no sistema).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  // 1. Valida o body
  let body: { npsScore?: unknown; scoreResultado?: unknown; comment?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const npsScore       = typeof body.npsScore       === 'number' ? body.npsScore       : null
  const scoreResultado = typeof body.scoreResultado === 'number' ? body.scoreResultado : null
  const comment        = typeof body.comment        === 'string' ? body.comment.trim() : null

  if (npsScore === null || scoreResultado === null) {
    return NextResponse.json({ error: 'npsScore e scoreResultado são obrigatórios' }, { status: 422 })
  }

  if (npsScore < 0 || npsScore > 10 || scoreResultado < 0 || scoreResultado > 10) {
    return NextResponse.json({ error: 'Scores devem estar entre 0 e 10' }, { status: 422 })
  }

  // 2. Busca o token e valida
  const { data: ft, error: tokenErr } = await supabaseAdmin
    .from('form_tokens')
    .select('id, client_id, agency_id, expires_at, responded_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr) {
    console.error('[forms/submit] DB error:', tokenErr)
    return NextResponse.json({ error: 'Erro ao processar formulário' }, { status: 500 })
  }

  if (!ft) {
    return NextResponse.json({ error: 'Formulário não encontrado', code: 'NOT_FOUND' }, { status: 404 })
  }

  // 3. Verifica expiração
  const now = new Date()
  if (ft.expires_at && new Date(ft.expires_at) < now) {
    return NextResponse.json({ error: 'Link expirado', code: 'EXPIRED' }, { status: 410 })
  }

  // 4. Verifica se já respondeu
  if (ft.responded_at) {
    return NextResponse.json({ error: 'Formulário já respondido', code: 'ALREADY_RESPONDED' }, { status: 409 })
  }

  // 5. Hash do IP para LGPD (não armazena IP bruto)
  const forwarded = req.headers.get('x-forwarded-for')
  const ip        = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const ipHash    = createHash('sha256').update(ip + ft.id).digest('hex')

  // 6. Insere a resposta
  const { error: insertErr } = await supabaseAdmin
    .from('form_submissions')
    .insert({
      token_id:        ft.id,
      client_id:       ft.client_id,
      agency_id:       ft.agency_id,
      nps_score:       npsScore,
      score_resultado: scoreResultado,
      comment:         comment || null,
      ip_hash:         ipHash,
    })

  if (insertErr) {
    console.error('[forms/submit] Insert error:', insertErr)
    return NextResponse.json({ error: 'Erro ao salvar resposta' }, { status: 500 })
  }

  // 7. Marca token como respondido
  await supabaseAdmin
    .from('form_tokens')
    .update({ responded_at: now.toISOString() })
    .eq('id', ft.id)

  return NextResponse.json({ success: true })
}
