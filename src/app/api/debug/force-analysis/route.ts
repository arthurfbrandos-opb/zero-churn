import { createClient } from '@/lib/supabase/server'
import { runFullAnalysis } from '@/lib/agents/orchestrator'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint de debug para forçar análise sem cache
 * GET /api/debug/force-analysis?clientId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    }

    const supabase = await createClient()

    // Busca cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, agencies(*)')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found', details: clientError }, { status: 404 })
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 FORCE ANALYSIS DEBUG')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Cliente:', client.name)
    console.log('Agência:', client.agencies?.name)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Executa análise (sem cache - revalidate: 0)
    const result = await runFullAnalysis(supabase, clientId, client.agency_id)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 RESULTADO DA ANÁLISE')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(JSON.stringify(result, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        agency: client.agencies?.name
      },
      result
    }, { status: 200 })

  } catch (error) {
    console.error('❌ Error in force-analysis:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
