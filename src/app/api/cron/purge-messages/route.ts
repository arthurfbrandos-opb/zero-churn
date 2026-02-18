/**
 * GET /api/cron/purge-messages
 *
 * Cron job que roda 1x por semana (domingo 03:00 BRT).
 * Remove mensagens do WhatsApp com mais de 90 dias do banco.
 *
 * Por quê 90 dias?
 *   - Análise de Proximidade usa janela de 60 dias
 *   - 30 dias de margem para relatórios históricos
 *   - Mantém o banco leve independente do volume de agências
 *
 * Autenticado via CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  // Autenticação do cron
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)
  const cutoffUnix = Math.floor(cutoffDate.getTime() / 1000)

  // Conta antes de deletar
  const { count: total } = await supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .lt('timestamp_unix', cutoffUnix)

  // Deleta em lotes de 1000 para evitar timeout
  let deleted = 0
  let hasMore = true

  while (hasMore) {
    // Busca IDs do próximo lote
    const { data: batch } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .lt('timestamp_unix', cutoffUnix)
      .limit(1000)

    if (!batch || batch.length === 0) { hasMore = false; break }

    const ids = batch.map(r => r.id)
    const { error } = await supabase
      .from('whatsapp_messages')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('[purge-messages] Erro ao deletar lote:', error.message)
      return NextResponse.json({
        error: error.message,
        deleted,
      }, { status: 500 })
    }

    deleted += batch.length
    if (batch.length < 1000) hasMore = false
  }

  // Conta restante após purge
  const { count: remaining } = await supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })

  console.log(`[purge-messages] Deletadas ${deleted} mensagens (>${90}d). Restam: ${remaining}`)

  return NextResponse.json({
    ok:        true,
    deleted,
    remaining: remaining ?? 0,
    cutoff:    cutoffDate.toISOString(),
    totalBefore: total ?? 0,
  })
}
