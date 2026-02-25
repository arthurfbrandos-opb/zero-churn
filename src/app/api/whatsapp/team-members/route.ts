/**
 * CRUD /api/whatsapp/team-members
 * GET    — lista membros do time da agência
 * POST   — upsert (adiciona ou atualiza membros)
 * DELETE  — remove por jid (query param ?jid=xxxx)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const { data: members, error } = await supabase
      .from('whatsapp_team_members')
      .select('id, jid, display_name, auto_detected, created_at')
      .eq('agency_id', agencyUser.agency_id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      members: (members ?? []).map(m => ({
        id:           m.id,
        jid:          m.jid,
        displayName:  m.display_name,
        autoDetected: m.auto_detected,
      })),
    })
  } catch (error) {
    console.error('[GET /api/whatsapp/team-members]', error)
    return NextResponse.json({ error: 'Erro ao buscar membros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const body = await request.json()
    const members: { jid: string; displayName?: string }[] = body.members ?? []

    if (!members.length) {
      return NextResponse.json({ error: 'Nenhum membro fornecido' }, { status: 400 })
    }

    const rows = members.map(m => ({
      agency_id:    agencyUser.agency_id,
      jid:          m.jid,
      display_name: m.displayName ?? null,
      auto_detected: false,
    }))

    const { error } = await supabase
      .from('whatsapp_team_members')
      .upsert(rows, { onConflict: 'agency_id,jid' })

    if (error) throw error

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    console.error('[POST /api/whatsapp/team-members]', error)
    return NextResponse.json({ error: 'Erro ao salvar membros' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const jid = request.nextUrl.searchParams.get('jid')
    if (!jid) return NextResponse.json({ error: 'jid obrigatório' }, { status: 400 })

    const { error } = await supabase
      .from('whatsapp_team_members')
      .delete()
      .eq('agency_id', agencyUser.agency_id)
      .eq('jid', jid)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/whatsapp/team-members]', error)
    return NextResponse.json({ error: 'Erro ao remover membro' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
