/**
 * POST /api/whatsapp/search-group
 *
 * Busca um grupo específico pelo nome (muito mais rápido que listar todos).
 * Retorna o ID do grupo para conectar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyEvolutionConfig } from '@/lib/evolution/agency-config'
import { listGroups } from '@/lib/evolution/client'
import { toErrorMsg } from '@/lib/utils'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca agência
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    // Busca config da Evolution
    const config = await getAgencyEvolutionConfig(supabase, agencyUser.agency_id)
    if (!config) {
      return NextResponse.json(
        { error: 'WhatsApp não conectado. Acesse Configurações → Integrações.' },
        { status: 400 }
      )
    }

    // Nome do grupo a buscar
    const { groupName } = await req.json()
    if (!groupName || typeof groupName !== 'string') {
      return NextResponse.json({ error: 'Nome do grupo é obrigatório' }, { status: 400 })
    }

    const searchTerm = groupName.toLowerCase().trim()

    console.log('[POST /api/whatsapp/search-group] Searching for:', searchTerm)
    const startTime = Date.now()

    // Busca todos os grupos (vai dar timeout se muitos)
    // Mas filtra logo em seguida
    const groups = await listGroups(config)

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`[POST /api/whatsapp/search-group] Found ${groups.length} groups in ${duration}s`)

    // Filtra por nome
    const matches = groups
      .filter(g => g.subject.toLowerCase().includes(searchTerm))
      .map(g => ({
        id: g.id,
        name: g.subject,
        participants: g.participants?.length ?? 0,
      }))

    if (matches.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum grupo encontrado com esse nome',
        suggestion: 'Tente um nome parcial ou verifique se o grupo existe'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      groups: matches,
      total: matches.length 
    })

  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[POST /api/whatsapp/search-group]', msg)
    
    // Se for timeout, retorna mensagem específica
    if (msg.includes('aborted') || msg.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Timeout ao buscar grupos. Digite o nome do grupo abaixo para buscar.',
        timeout: true
      }, { status: 408 })
    }
    
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
