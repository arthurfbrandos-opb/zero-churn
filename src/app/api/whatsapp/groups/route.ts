/**
 * GET /api/whatsapp/groups
 *
 * Lista todos os grupos WhatsApp que a instância da agência participa.
 * Usado na aba Integrações do cliente para buscar e vincular um grupo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyEvolutionConfig } from '@/lib/evolution/agency-config'
import { listGroups } from '@/lib/evolution/client'
import { toErrorMsg } from '@/lib/utils'

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
        { error: 'Evolution API não configurada. Acesse Configurações → Integrações.' },
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

    return NextResponse.json({ groups: filtered })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[GET /api/whatsapp/groups]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
