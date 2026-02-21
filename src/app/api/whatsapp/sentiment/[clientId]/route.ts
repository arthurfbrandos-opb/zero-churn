/**
 * POST /api/whatsapp/sentiment/[clientId]
 *
 * Roda APENAS o Agente Proximidade de forma isolada para um cliente.
 * Retorna score de sentimento, engajamento e flags sem rodar o Health Score completo.
 *
 * Coleta mensagens do banco (webhook) com fallback para Evolution API live.
 * Custo: ~R$ 0.03 por análise (GPT-3.5 + GPT-4o).
 */

import { toErrorMsg } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgenteProximidade } from '@/lib/agents/proximidade'
import { getAgencyEvolutionConfig } from '@/lib/evolution/agency-config'
import { fetchGroupMessages, extractMessageText } from '@/lib/evolution/client'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // 2. Resolve agency
  const { data: au } = await supabase
    .from('agency_users')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!au?.agency_id) {
    return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
  }

  // 3. Get client's group ID
  const { data: client } = await supabase
    .from('clients')
    .select('id, whatsapp_group_id')
    .eq('id', clientId)
    .eq('agency_id', au.agency_id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  const groupId = client.whatsapp_group_id as string | null
  if (!groupId) {
    return NextResponse.json({ error: 'WhatsApp não conectado para este cliente' }, { status: 422 })
  }

  try {
    // 4. Collect messages (DB first → Evolution API fallback)
    let messages: { content: string; senderName: string | null; timestamp: number; fromMe: boolean }[] = []
    const cutoff = Math.floor(Date.now() / 1000) - 60 * 86400

    // 4a. Try local DB (webhook-populated)
    const { data: dbMsgs } = await supabase
      .from('whatsapp_messages')
      .select('content, sender_name, timestamp_unix, from_me')
      .eq('group_id', groupId.includes('@g.us') ? groupId : `${groupId}@g.us`)
      .eq('agency_id', au.agency_id)
      .gte('timestamp_unix', cutoff)
      .order('timestamp_unix', { ascending: true })
      .limit(1000)

    if (dbMsgs && dbMsgs.length > 0) {
      messages = dbMsgs.map(m => ({
        content:    String(m.content),
        senderName: m.sender_name ? String(m.sender_name) : null,
        timestamp:  Number(m.timestamp_unix),
        fromMe:     Boolean(m.from_me),
      }))
    } else {
      // 4b. Fallback: Evolution API live fetch
      const evolutionConfig = await getAgencyEvolutionConfig(supabase, au.agency_id)
      if (evolutionConfig) {
        const rawMsgs = await fetchGroupMessages(groupId, evolutionConfig, 60, 1000)
        messages = rawMsgs.flatMap(m => {
          const text = extractMessageText(m)
          if (!text?.trim()) return []
          return [{
            content:    text.trim(),
            senderName: m.pushName ?? null,
            timestamp:  m.messageTimestamp,
            fromMe:     m.key.fromMe,
          }]
        })
      }
    }

    // 5. Run ONLY the Proximity Agent
    const openaiKey = process.env.OPENAI_API_KEY ?? undefined
    const result = await runAgenteProximidade({
      clientId,
      groupId,
      messages,
      days: 60,
      openaiKey,
    })

    // 6. Return structured result
    return NextResponse.json({
      success:         true,
      score:           result.score,
      sentiment:       (result.details.sentiment as string | undefined) ?? null,
      engagementLevel: (result.details.engagementLevel as string | undefined) ?? null,
      summary:         (result.details.summary as string | undefined) ?? null,
      flags:           result.flags,
      totalMessages:   (result.details.totalMessages as number | undefined) ?? 0,
      status:          result.status,
      durationMs:      result.durationMs,
    })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[whatsapp/sentiment POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
