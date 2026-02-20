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

// NOTA: maxDuration pode não funcionar no Vercel Hobby (plano gratuito)
// Vercel Hobby tem limite de 10s para Serverless Functions
// Vercel Pro tem limite configurável até 300s
export const maxDuration = 60 // Reduzido para 60s (mais realista)

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

    console.log('[GET /api/whatsapp/groups] Fetching groups (timeout: 55s)...')
    const startTime = Date.now()
    
    // Cria AbortController com timeout de 55s (antes do timeout do Vercel)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55000)
    
    try {
      const groups = await listGroups(config, controller.signal)
      clearTimeout(timeoutId)
      
      const duration = Math.round((Date.now() - startTime) / 1000)
      console.log(`[GET /api/whatsapp/groups] ✅ Fetched ${groups.length} groups in ${duration}s`)

      const filtered = groups
        .filter(g => !search || g.subject.toLowerCase().includes(search))
        .sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR'))
        .map(g => ({
          id:           g.id,
          name:         g.subject,
          participants: g.participants?.length ?? 0,
        }))

      return NextResponse.json({ groups: filtered, total: groups.length })
    } catch (abortErr) {
      clearTimeout(timeoutId)
      if (abortErr instanceof Error && abortErr.name === 'AbortError') {
        console.error('[GET /api/whatsapp/groups] ❌ Timeout após 55s')
        return NextResponse.json({ 
          error: 'Timeout: Muitos grupos. Use input manual do ID do grupo.',
          suggestion: 'Digite o ID do grupo manualmente (ex: 120363xxxxx@g.us)'
        }, { status: 408 })
      }
      throw abortErr
    }
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[GET /api/whatsapp/groups]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
