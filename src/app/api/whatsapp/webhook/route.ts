/**
 * POST /api/whatsapp/webhook
 *
 * Recebe eventos da Evolution API e armazena mensagens de grupos
 * no banco para alimentar o agente de Proximidade.
 *
 * URL que deve ser registrada na Evolution: https://zero-churn.vercel.app/api/whatsapp/webhook
 * O registro é feito automaticamente ao salvar a integração em Configurações.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/supabase/encryption'
import { extractMessageText } from '@/lib/evolution/client'
import type { EvolutionMessage } from '@/lib/evolution/client'

// Usa service role — inserção sem autenticação de usuário (webhook público)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Tipos do payload da Evolution API v2 ─────────────────────────

interface WebhookPayload {
  event:       string
  instance:    string
  data:        EvolutionMessage | EvolutionMessage[]
  apikey?:     string
  server_url?: string
}

// ── Handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let payload: WebhookPayload

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Só processa eventos de mensagens novas
  const event = (payload.event ?? '').toUpperCase().replace('.', '_')
  if (!event.includes('MESSAGES_UPSERT')) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const instanceName = payload.instance
  if (!instanceName) {
    return NextResponse.json({ error: 'Missing instance name' }, { status: 400 })
  }

  // ── 1. Identifica agência pelo instance_name ──────────────────
  const { data: integrations } = await supabase
    .from('agency_integrations')
    .select('agency_id, encrypted_key')
    .eq('type', 'evolution_api')
    .eq('status', 'active')

  let agencyId: string | null = null

  for (const integ of integrations ?? []) {
    try {
      const creds = await decrypt<{ instance_name?: string }>(integ.encrypted_key)
      if (creds.instance_name === instanceName) {
        agencyId = integ.agency_id
        break
      }
    } catch { /* skip */ }
  }

  if (!agencyId) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'instance not mapped' })
  }

  // ── 2. Mapeamento group_id → client_id ───────────────────────
  const { data: clientIntegs } = await supabase
    .from('client_integrations')
    .select('client_id, metadata')
    .eq('type', 'whatsapp')

  const groupToClient: Record<string, string> = {}
  for (const ci of clientIntegs ?? []) {
    const groupId = (ci.metadata as Record<string, string> | null)?.groupId
    if (groupId && ci.client_id) {
      groupToClient[groupId] = ci.client_id
      groupToClient[groupId.replace('@g.us', '')] = ci.client_id
    }
  }

  // ── 3. Normaliza e filtra mensagens ───────────────────────────
  const messages: EvolutionMessage[] = Array.isArray(payload.data)
    ? payload.data
    : [payload.data]

  const toInsert: Record<string, unknown>[] = []

  for (const msg of messages) {
    const remoteJid = msg.key?.remoteJid ?? ''
    if (!remoteJid.includes('@g.us')) continue   // só grupos

    const text = extractMessageText(msg)
    if (!text?.trim()) continue                  // ignora mídia sem texto

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

  // ── 4. Salva no banco ─────────────────────────────────────────
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('whatsapp_messages')
      .upsert(toInsert, { onConflict: 'agency_id,message_id', ignoreDuplicates: true })

    if (error) {
      console.error('[webhook/whatsapp] Erro ao salvar:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, saved: toInsert.length })
}
