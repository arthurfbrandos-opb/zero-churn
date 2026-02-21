/**
 * GET /api/whatsapp/agency/status
 * 
 * Retorna status da conexão WhatsApp da agência
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemEvolutionConfig, getInstanceStatus } from '@/lib/evolution/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca agência
    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser) {
      return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    }

    // Busca dados da agência
    const { data: agency } = await supabase
      .from('agencies')
      .select('whatsapp_instance_name, whatsapp_phone, whatsapp_connected_at')
      .eq('id', agencyUser.agency_id)
      .single()

    if (!agency?.whatsapp_instance_name) {
      return NextResponse.json({
        connected: false,
        message: 'WhatsApp não configurado'
      })
    }

    // Verifica status no Evolution API
    const config = getSystemEvolutionConfig(agency.whatsapp_instance_name)
    const status = await getInstanceStatus(config)

    // Se conectou agora, atualiza banco
    if (status.connected && !agency.whatsapp_connected_at) {
      await supabase
        .from('agencies')
        .update({
          whatsapp_phone: status.phone,
          whatsapp_connected_at: new Date().toISOString(),
          whatsapp_qr_code: null, // Limpa QR Code
        })
        .eq('id', agencyUser.agency_id)
    }

    return NextResponse.json({
      connected: status.connected,
      phone: status.phone,
      connectedAt: agency.whatsapp_connected_at,
      state: status.state,
    })

  } catch (error) {
    console.error('[GET /api/whatsapp/agency/status]', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro ao verificar status'
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
