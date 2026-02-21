/**
 * DELETE /api/whatsapp/agency/disconnect
 * 
 * Desconecta WhatsApp da agência (logout)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemEvolutionConfig, logoutInstance } from '@/lib/evolution/client'

export async function DELETE() {
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

    // Busca instance_name
    const { data: agency } = await supabase
      .from('agencies')
      .select('whatsapp_instance_name')
      .eq('id', agencyUser.agency_id)
      .single()

    if (!agency?.whatsapp_instance_name) {
      return NextResponse.json({ error: 'WhatsApp não conectado' }, { status: 400 })
    }

    // Logout no Evolution API
    const config = getSystemEvolutionConfig(agency.whatsapp_instance_name)
    await logoutInstance(config)

    // Limpa dados no banco
    await supabase
      .from('agencies')
      .update({
        whatsapp_phone: null,
        whatsapp_connected_at: null,
        whatsapp_qr_code: null,
      })
      .eq('id', agencyUser.agency_id)

    console.log(`[DELETE /api/whatsapp/agency/disconnect] ✅ Disconnected: ${agency.whatsapp_instance_name}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[DELETE /api/whatsapp/agency/disconnect]', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro ao desconectar'
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
