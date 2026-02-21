/**
 * GET /api/whatsapp/agency/groups
 * 
 * Lista grupos WhatsApp da agência (RÁPIDO - só grupos desta agência)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemEvolutionConfig, listGroups } from '@/lib/evolution/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca agência
    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser) {
      return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    }

    // Busca instance_name
    const { data: agency } = await supabase
      .from('agencies')
      .select('whatsapp_instance_name')
      .eq('id', agencyUser.agency_id)
      .single()

    if (!agency?.whatsapp_instance_name) {
      return NextResponse.json({ 
        error: 'WhatsApp não conectado. Conecte em Configurações → WhatsApp' 
      }, { status: 400 })
    }

    console.log(`[GET /api/whatsapp/agency/groups] Fetching for instance: ${agency.whatsapp_instance_name}`)
    const startTime = Date.now()

    // Lista grupos (será rápido - só desta agência)
    const config = getSystemEvolutionConfig(agency.whatsapp_instance_name)
    const groups = await listGroups(config)

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`[GET /api/whatsapp/agency/groups] ✅ Found ${groups.length} groups in ${duration}s`)

    const formatted = groups
      .sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR'))
      .map(g => ({
        id: g.id,
        name: g.subject,
        participants: g.participants?.length ?? 0,
      }))

    return NextResponse.json({ 
      groups: formatted,
      total: formatted.length 
    })

  } catch (error) {
    console.error('[GET /api/whatsapp/agency/groups]', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro ao buscar grupos'
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60
