/**
 * GET /api/forms/[token]
 *
 * Rota pública (sem auth) — retorna dados do formulário de satisfação.
 * Usa service role para bypassar RLS (a policy "Formulario publico le token"
 * permite SELECT em form_tokens, mas clients e agencies têm RLS restritivo).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  // Busca o token + dados do cliente + dados da agência
  const { data: ft, error } = await supabaseAdmin
    .from('form_tokens')
    .select(`
      id,
      token,
      expires_at,
      responded_at,
      sent_at,
      client_id,
      agency_id,
      clients (
        id,
        name,
        nome_resumido
      ),
      agencies (
        id,
        name,
        logo_url
      )
    `)
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('[forms/token] DB error:', error)
    return NextResponse.json({ error: 'Erro ao buscar formulário' }, { status: 500 })
  }

  if (!ft) {
    return NextResponse.json({ error: 'Formulário não encontrado', code: 'NOT_FOUND' }, { status: 404 })
  }

  const now = new Date()
  const expired = ft.expires_at ? new Date(ft.expires_at) < now : false
  const alreadyResponded = !!ft.responded_at

  // Supabase retorna arrays para joins — pega o primeiro item
  const clientArr = ft.clients  as unknown as { id: string; name: string; nome_resumido: string | null }[] | null
  const agencyArr = ft.agencies as unknown as { id: string; name: string; logo_url: string | null }[] | null
  const client  = Array.isArray(clientArr) ? clientArr[0] : (ft.clients  as unknown as { id: string; name: string; nome_resumido: string | null } | null)
  const agency  = Array.isArray(agencyArr) ? agencyArr[0] : (ft.agencies as unknown as { id: string; name: string; logo_url: string | null } | null)

  return NextResponse.json({
    tokenId:        ft.id,
    token:          ft.token,
    expired,
    alreadyResponded,
    clientName:     client?.nome_resumido ?? client?.name ?? 'Cliente',
    agencyName:     agency?.name ?? 'Agência',
    agencyLogoUrl:  agency?.logo_url ?? null,
    expiresAt:      ft.expires_at,
    sentAt:         ft.sent_at,
  })
}
