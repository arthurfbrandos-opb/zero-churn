import { toErrorMsg } from '@/lib/utils'
/**
 * GET  /api/alerts          — lista alertas da agência (não lidos primeiro)
 * PATCH /api/alerts?id=xxx  — marca como lido
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ alerts: [] })

    const limit      = parseInt(request.nextUrl.searchParams.get('limit') ?? '100')
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
    const countOnly  = request.nextUrl.searchParams.get('unread') === '1'

    // Modo contagem — retorna só o número de não lidos (para o badge)
    if (countOnly) {
      const { count, error: cErr } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyUser.agency_id)
        .eq('is_read', false)
      if (cErr) throw cErr
      return NextResponse.json({ unread_count: count ?? 0 })
    }

    let q = supabase
      .from('alerts')
      .select(`id, client_id, type, severity, message, is_read, created_at,
               clients(name, nome_resumido)`)
      .eq('agency_id', agencyUser.agency_id)
      .order('is_read', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) q = q.eq('is_read', false)

    const { data, error: qErr } = await q
    if (qErr) throw qErr

    return NextResponse.json({ alerts: data ?? [] })
  } catch (err) {
    const msg = toErrorMsg(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    // Atualiza apenas se o alerta pertence à agência do usuário (segurança)
    const { error: upErr } = await supabase
      .from('alerts').update({ is_read: true })
      .eq('id', id).eq('agency_id', agencyUser.agency_id)
    if (upErr) throw upErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = toErrorMsg(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
