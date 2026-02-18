import { toErrorMsg } from '@/lib/utils'
/**
 * POST /api/whatsapp/validate-group
 *
 * Valida se um group_id existe e a instância Evolution tem acesso.
 * Body: { groupId: string }
 *
 * Autenticada — usa RLS via cookie de sessão.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateGroup } from '@/lib/evolution/client'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: { groupId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : null
  if (!groupId) return NextResponse.json({ error: 'groupId obrigatório' }, { status: 422 })

  // Verifica se a Evolution API está configurada
  if (!process.env.EVOLUTION_API_URL) {
    return NextResponse.json({
      error: 'WhatsApp não configurado',
      details: 'EVOLUTION_API_URL não está definido. Configure nas variáveis de ambiente.',
    }, { status: 503 })
  }

  try {
    const group = await validateGroup(groupId)
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
