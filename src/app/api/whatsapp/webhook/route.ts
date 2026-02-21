/**
 * POST /api/whatsapp/webhook
 *
 * Recebe eventos da Evolution API:
 *  - MESSAGES_UPSERT    → salva mensagens dos grupos no banco
 *  - CONNECTION_UPDATE  → atualiza status de conexão da agência
 *
 * URL registrada automaticamente ao conectar: /api/whatsapp/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractMessageText } from '@/lib/evolution/client'
import type { EvolutionMessage } from '@/lib/evolution/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface WebhookPayload {
  event:       string
  instance:    string
  data:        unknown
  apikey?:     string
}

// ── Resolve agência pelo nome da instância ────────────────────────

async function resolveAgencyId(instanceName: string): Promise<string | null> {
  // Busca direta por whatsapp_instance_name (migration 016 - tabela agencies)
  const { data } = await supabase
    .from('agencies')
    .select('id')
    .eq('whatsapp_instance_name', instanceName)
    .maybeSingle()

  if (data?.id) return data.id

  // Fallback: convenção agency_{agencyId}
  if (instanceName.startsWith('agency_')) {
    const candidateId = instanceName.replace('agency_', '')
    const { data: fallback } = await supabase
      .from('agencies')
      .select('id')
      .eq('id', candidateId)
      .maybeSingle()
    if (fallback?.id) return fallback.id
  }

  return null
}

// ── Handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let payload: WebhookPayload
  try { payload = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const event        = (payload.event ?? '').toUpperCase().replace(/\./g, '_')
  const instanceName = payload.instance

  if (!instanceName) return NextResponse.json({ ok: true, skipped: true })

  // Resolve agência uma vez para todos os eventos
  const agencyId = await resolveAgencyId(instanceName)

  // ── 1. CONNECTION_UPDATE ─────────────────────────────────────
  if (event.includes('CONNECTION_UPDATE')) {
    if (agencyId) {
      const conn  = payload.data as Record<string, unknown>
      const state = conn?.state as string | undefined
      const phone = (conn?.wuid as string | undefined)?.replace('@s.whatsapp.net', '')

      const { saveAgencyEvolutionRecord } = await import('@/lib/evolution/agency-config')

      if (state === 'open') {
        await saveAgencyEvolutionRecord(supabase, agencyId, instanceName, {
          phoneNumber: phone,
          connectedAt: new Date().toISOString(),
          status:      'active',
        })
      } else if (state === 'close' || state === 'refused') {
        await saveAgencyEvolutionRecord(supabase, agencyId, instanceName, {
          status: 'disconnected',
        })
      }
    }
    return NextResponse.json({ ok: true, event: 'connection_update' })
  }

  // ── 2. MESSAGES_UPSERT ───────────────────────────────────────
  if (!event.includes('MESSAGES_UPSERT')) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  if (!agencyId) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'instance not mapped' })
  }

  // Mapeamento group_id → client_id
  const { data: clientIntegs } = await supabase
    .from('client_integrations')
    .select('client_id, metadata')
    .eq('type', 'whatsapp')

  const groupToClient: Record<string, string> = {}
  for (const ci of clientIntegs ?? []) {
    const gid = (ci.metadata as Record<string, string> | null)?.groupId
    if (gid && ci.client_id) {
      groupToClient[gid] = ci.client_id
      groupToClient[gid.replace('@g.us', '')] = ci.client_id
    }
  }

  // Normaliza mensagens
  const messages: EvolutionMessage[] = Array.isArray(payload.data)
    ? payload.data as EvolutionMessage[]
    : [payload.data as EvolutionMessage]

  const toInsert: Record<string, unknown>[] = []

  for (const msg of messages) {
    const remoteJid = msg.key?.remoteJid ?? ''
    if (!remoteJid.includes('@g.us')) continue

    const text = extractMessageText(msg)
    if (!text?.trim()) continue

    toInsert.push({
      agency_id:      agencyId,
      client_id:      groupToClient[remoteJid] ?? groupToClient[remoteJid.replace('@g.us', '')] ?? null,
      group_id:       remoteJid,
      message_id:     msg.key.id,
      sender_jid:     msg.key.participant ?? remoteJid,
      sender_name:    msg.pushName ?? null,
      content:        text.trim(),
      message_type:   msg.messageType ?? 'unknown',
      from_me:        msg.key.fromMe ?? false,
      timestamp_unix: msg.messageTimestamp,
    })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('whatsapp_messages')
      .upsert(toInsert, { onConflict: 'agency_id,message_id', ignoreDuplicates: true })

    if (error) {
      console.error('[webhook] Erro ao salvar mensagens:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, saved: toInsert.length })
}
