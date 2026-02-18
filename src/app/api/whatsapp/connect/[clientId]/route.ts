/**
 * GET    /api/whatsapp/connect/[clientId] — retorna status da conexão WhatsApp do cliente
 * POST   /api/whatsapp/connect/[clientId] — conecta (salva group_id validado)
 * DELETE /api/whatsapp/connect/[clientId] — desconecta (limpa group_id)
 *
 * Autenticada — usa RLS via cookie de sessão.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateGroup } from '@/lib/evolution/client'

// ── GET ───────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: client } = await supabase
    .from('clients')
    .select('id, whatsapp_group_id')
    .eq('id', clientId)
    .maybeSingle()

  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const connected = !!client.whatsapp_group_id

  return NextResponse.json({
    connected,
    groupId: connected ? client.whatsapp_group_id : null,
  })
}

// ── POST ──────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: { groupId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : null
  if (!groupId) return NextResponse.json({ error: 'groupId obrigatório' }, { status: 422 })

  // Valida o grupo via Evolution API (só se estiver configurada)
  let groupName: string | null = null
  const evolutionConfigured = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY)

  if (evolutionConfigured) {
    try {
      const group = await validateGroup(groupId)
      groupName = group.subject
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Grupo inválido: ${msg}` }, { status: 422 })
    }
  }
  // Se a API não está configurada, salva o group_id sem validar (modo dev)

  // Salva o group_id no cliente
  const { error } = await supabase
    .from('clients')
    .update({ whatsapp_group_id: groupId })
    .eq('id', clientId)

  if (error) {
    console.error('[whatsapp/connect POST]', error)
    return NextResponse.json({ error: 'Erro ao salvar integração' }, { status: 500 })
  }

  // Cria (ou atualiza) registro em client_integrations
  await supabase
    .from('client_integrations')
    .upsert({
      client_id:  clientId,
      type:       'whatsapp',
      status:     'connected',
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'client_id,type' })
    .select('id')

  return NextResponse.json({
    connected: true,
    groupId,
    groupName,
    validated: evolutionConfigured,
  })
}

// ── DELETE ────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Remove o group_id
  const { error } = await supabase
    .from('clients')
    .update({ whatsapp_group_id: null })
    .eq('id', clientId)

  if (error) {
    console.error('[whatsapp/connect DELETE]', error)
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
  }

  // Atualiza status em client_integrations
  await supabase
    .from('client_integrations')
    .update({ status: 'disconnected' })
    .eq('client_id', clientId)
    .eq('type', 'whatsapp')

  return NextResponse.json({ connected: false })
}
