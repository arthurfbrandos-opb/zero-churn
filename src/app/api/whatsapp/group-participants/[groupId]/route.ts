/**
 * GET /api/whatsapp/group-participants/[groupId]
 *
 * Lista participantes de um grupo WhatsApp, cruzando com:
 * - whatsapp_team_members (já marcados)
 * - agencies.whatsapp_phone (auto-marcado)
 * - whatsapp_messages.sender_name (resolve nomes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemEvolutionConfig, validateGroup } from '@/lib/evolution/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    const agencyId = agencyUser.agency_id

    // Busca instance name e phone da agência
    const { data: agency } = await supabase
      .from('agencies')
      .select('whatsapp_instance_name, whatsapp_phone')
      .eq('id', agencyId)
      .single()

    if (!agency?.whatsapp_instance_name) {
      return NextResponse.json({ error: 'WhatsApp da agência não está conectado' }, { status: 400 })
    }

    // Busca participantes do grupo via Evolution
    const config = getSystemEvolutionConfig(agency.whatsapp_instance_name)
    const groupInfo = await validateGroup(groupId, config)

    // Busca team members já cadastrados
    const { data: teamMembers } = await supabase
      .from('whatsapp_team_members')
      .select('jid, display_name')
      .eq('agency_id', agencyId)

    const teamJids = new Set((teamMembers ?? []).map(m => m.jid))

    // Resolve nomes via whatsapp_messages
    const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`
    const { data: senderNames } = await supabase
      .from('whatsapp_messages')
      .select('sender_jid, sender_name')
      .eq('group_id', jid)
      .eq('agency_id', agencyId)
      .not('sender_name', 'is', null)
      .not('sender_jid', 'is', null)
      .order('timestamp_unix', { ascending: false })
      .limit(500)

    // Build jid→name map (most recent name wins)
    const nameMap = new Map<string, string>()
    for (const row of senderNames ?? []) {
      if (row.sender_jid && row.sender_name && !nameMap.has(row.sender_jid)) {
        nameMap.set(row.sender_jid, row.sender_name)
      }
    }

    // Also map from team members display names
    for (const tm of teamMembers ?? []) {
      if (tm.display_name && !nameMap.has(tm.jid)) {
        nameMap.set(tm.jid, tm.display_name)
      }
    }

    // Normalize agency phone to JID format
    const agencyPhone = agency.whatsapp_phone?.replace(/\D/g, '') ?? ''
    const agencyJid = agencyPhone ? `${agencyPhone}@s.whatsapp.net` : ''

    const participants = (groupInfo.participants ?? []).map(p => {
      const isAgencyPhone = agencyJid && p.id === agencyJid
      const isTeam = teamJids.has(p.id) || isAgencyPhone
      return {
        jid:           p.id,
        displayName:   nameMap.get(p.id) ?? p.id.replace('@s.whatsapp.net', ''),
        isAdmin:       p.admin === 'admin' || p.admin === 'superadmin',
        isTeam,
        isAgencyPhone,
      }
    })

    // Sort: team first, then alphabetical
    participants.sort((a, b) => {
      if (a.isAgencyPhone !== b.isAgencyPhone) return a.isAgencyPhone ? -1 : 1
      if (a.isTeam !== b.isTeam) return a.isTeam ? -1 : 1
      return a.displayName.localeCompare(b.displayName, 'pt-BR')
    })

    return NextResponse.json({ participants })
  } catch (error) {
    console.error('[GET /api/whatsapp/group-participants]', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro ao buscar participantes',
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 30
