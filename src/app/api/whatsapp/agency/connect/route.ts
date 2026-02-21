/**
 * POST /api/whatsapp/agency/connect
 * 
 * Conecta WhatsApp da agência (cria instância Evolution + retorna QR Code)
 * Cada agência tem sua própria instância isolada.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemEvolutionConfig, createInstance, getInstanceQRCode, registerWebhook } from '@/lib/evolution/client'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca agência do usuário
    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser) {
      return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    }

    const agencyId = agencyUser.agency_id

    // Nome da instância: agency_{uuid}
    const instanceName = `agency_${agencyId}`

    console.log(`[POST /api/whatsapp/agency/connect] Creating instance: ${instanceName}`)

    // Cria instância no Evolution API
    const config = getSystemEvolutionConfig(instanceName)
    
    try {
      await createInstance(config)
      console.log(`[POST /api/whatsapp/agency/connect] ✅ Instance created`)
    } catch (err) {
      // Se já existe, ignora (idempotente)
      console.log(`[POST /api/whatsapp/agency/connect] Instance already exists (OK)`)
    }

    // Busca QR Code
    const qrCode = await getInstanceQRCode(config)

    if (!qrCode) {
      return NextResponse.json({ 
        error: 'Instância já conectada',
        connected: true 
      }, { status: 200 })
    }

    // Registra webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
    await registerWebhook(config, webhookUrl)
    console.log(`[POST /api/whatsapp/agency/connect] ✅ Webhook registered: ${webhookUrl}`)

    // Salva instance_name e QR Code no banco
    await supabase
      .from('agencies')
      .update({
        whatsapp_instance_name: instanceName,
        whatsapp_qr_code: qrCode,
      })
      .eq('id', agencyId)

    return NextResponse.json({
      qrCode,
      instanceName,
      message: 'Escaneie o QR Code com seu WhatsApp'
    })

  } catch (error) {
    console.error('[POST /api/whatsapp/agency/connect]', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro ao conectar WhatsApp'
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
