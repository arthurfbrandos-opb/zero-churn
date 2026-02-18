import { toErrorMsg } from '@/lib/utils'
/**
 * POST /api/whatsapp/validate-group
 *
 * Valida se um group_id existe e a instância Evolution da agência tem acesso.
 * Body: { groupId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateGroup } from '@/lib/evolution/client'
import { getAgencyEvolutionConfig } from '@/lib/evolution/agency-config'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: { groupId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : null
  if (!groupId) return NextResponse.json({ error: 'groupId obrigatório' }, { status: 422 })

  // Busca config Evolution da agência
  const { data: agencyUser } = await supabase
    .from('agency_users').select('agency_id').eq('user_id', user.id).single()

  if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

  const config = await getAgencyEvolutionConfig(supabase, agencyUser.agency_id)
  if (!config) {
    return NextResponse.json({
      error:   'WhatsApp não configurado',
      details: 'Acesse Configurações → Integrações → WhatsApp para configurar.',
    }, { status: 503 })
  }

  try {
    const group = await validateGroup(groupId, config)
    return NextResponse.json({
      valid:        true,
      groupId:      group.id,
      name:         group.subject,
      participants: group.participants.length,
    })
  } catch (err) {
    const msg = toErrorMsg(err)
    return NextResponse.json({ valid: false, error: msg }, { status: 422 })
  }
}
