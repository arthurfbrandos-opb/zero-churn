/**
 * GET /api/whatsapp/groups
 *
 * Lista todos os grupos WhatsApp que a instância da agência participa.
 * Usado na aba Integrações do cliente para buscar e vincular um grupo,
 * e em Configurações → WhatsApp para "Ver grupos ativos".
 *
 * ⚠️ maxDuration=60: fetchAllGroups pode demorar 25-45s com 100+ grupos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyEvolutionConfig } from '@/lib/evolution/agency-config'
import { listGroups } from '@/lib/evolution/client'
import { toErrorMsg } from '@/lib/utils'

// Aumenta o timeout desta rota para 60s (Vercel default é 10s)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca agência
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    // Busca config da Evolution desta agência
    const config = await getAgencyEvolutionConfig(supabase, agencyUser.agency_id)
    if (!config) {
      return NextResponse.json(
        { error: 'WhatsApp não conectado. Acesse Configurações → Integrações.' },
        { status: 400 }
      )
    }

    // Filtro opcional por nome
    const search = req.nextUrl.searchParams.get('q')?.toLowerCase() ?? ''

    const groups = await listGroups(config)

    const filtered = groups
      .filter(g => !search || g.subject.toLowerCase().includes(search))
      .sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR'))
      .map(g => ({
        id:           g.id,
        name:         g.subject,
        participants: g.participants?.length ?? 0,
      }))

    return NextResponse.json({ groups: filtered, total: groups.length })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[GET /api/whatsapp/groups]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
