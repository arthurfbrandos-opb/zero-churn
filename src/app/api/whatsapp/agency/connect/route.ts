/**
 * POST /api/whatsapp/agency/connect
 * 
 * Conecta WhatsApp da agência (cria instância Evolution + retorna QR Code)
 * Sistema robusto com retry automático e debug detalhado.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemEvolutionConfig, createInstance, getInstanceQRCode, getInstanceStatus, registerWebhook } from '@/lib/evolution/client'

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

    // Busca dados da agência
    const { data: agency } = await supabase
      .from('agencies')
      .select('whatsapp_instance_name, whatsapp_phone, whatsapp_connected_at')
      .eq('id', agencyId)
      .single()

    // Nome da instância (único por agência)
    const instanceName = agency?.whatsapp_instance_name || `agency_${agencyId}`
    const config = getSystemEvolutionConfig(instanceName)

    console.log(`[WhatsApp Connect] Starting for: ${instanceName}`)

    // ── PASSO 1: Verifica/Cria instância ──
    let status
    let instanceExists = false
    
    try {
      console.log('[WhatsApp Connect] Checking status...')
      status = await getInstanceStatus(config)
      instanceExists = true
      console.log('[WhatsApp Connect] Status:', status)
    } catch (err) {
      console.log('[WhatsApp Connect] Instance does not exist, creating...')
      
      // Retry create até 3 vezes
      let createSuccess = false
      for (let i = 0; i < 3; i++) {
        try {
          await createInstance(config)
          console.log(`[WhatsApp Connect] ✅ Instance created (attempt ${i + 1})`)
          createSuccess = true
          break
        } catch (createErr) {
          console.error(`[WhatsApp Connect] ❌ Create error (attempt ${i + 1}):`, createErr)
          if (i < 2) await new Promise(r => setTimeout(r, 2000))
        }
      }
      
      if (!createSuccess) {
        return NextResponse.json({ error: 'Falha ao criar instância após 3 tentativas' }, { status: 500 })
      }

      // Aguarda instância inicializar (3s)
      console.log('[WhatsApp Connect] Waiting 3s for initialization...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Pega status novamente
      try {
        status = await getInstanceStatus(config)
        instanceExists = true
        console.log('[WhatsApp Connect] ✅ Status after creation:', status)
      } catch (statusErr) {
        console.error('[WhatsApp Connect] ❌ Status error after creation:', statusErr)
        return NextResponse.json({ error: 'Instância criada mas status indisponível' }, { status: 500 })
      }
    }

    // ── PASSO 2: Verifica se já está conectado ──
    if (status.connected && status.phone) {
      console.log('[WhatsApp Connect] ✅ Already connected:', status.phone)
      
      // Atualiza DB
      await supabase.from('agencies').update({
        whatsapp_instance_name: instanceName,
        whatsapp_phone:         status.phone,
        whatsapp_connected_at:  agency?.whatsapp_connected_at || new Date().toISOString(),
        whatsapp_qr_code:       null, // Limpa QR antigo
      }).eq('id', agencyId)

      return NextResponse.json({
        connected: true,
        phone:     status.phone,
        message:   'WhatsApp já está conectado',
      })
    }

    // ── PASSO 3: Pega QR Code ──
    console.log('[WhatsApp Connect] Generating QR Code...')
    
    let qrCode = null
    for (let i = 0; i < 3; i++) {
      try {
        qrCode = await getInstanceQRCode(config)
        if (qrCode) {
          console.log(`[WhatsApp Connect] ✅ QR Code obtained (attempt ${i + 1})`)
          break
        }
        console.log(`[WhatsApp Connect] ⚠️  QR Code null (attempt ${i + 1})`)
        if (i < 2) await new Promise(r => setTimeout(r, 2000))
      } catch (qrErr) {
        console.error(`[WhatsApp Connect] ❌ QR error (attempt ${i + 1}):`, qrErr)
        if (i < 2) await new Promise(r => setTimeout(r, 2000))
      }
    }

    if (!qrCode) {
      return NextResponse.json({ 
        error: 'Não foi possível gerar QR Code após 3 tentativas',
        debug: { instanceName, status, instanceExists }
      }, { status: 500 })
    }

    // ── PASSO 4: Registra webhook ──
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
      await registerWebhook(config, webhookUrl)
      console.log(`[WhatsApp Connect] ✅ Webhook registered: ${webhookUrl}`)
    } catch (webhookErr) {
      console.error('[WhatsApp Connect] ⚠️  Webhook registration failed (non-critical):', webhookErr)
    }

    // ── PASSO 5: Salva no DB ──
    await supabase.from('agencies').update({
      whatsapp_instance_name: instanceName,
      whatsapp_qr_code:       qrCode,
      whatsapp_phone:         null,
      whatsapp_connected_at:  null,
    }).eq('id', agencyId)

    console.log('[WhatsApp Connect] ✅ QR Code saved to DB')

    // Formata QR Code (adiciona data URI se necessário)
    const formattedQR = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`

    return NextResponse.json({
      connected: false,
      qrCode:    formattedQR,
      instanceName,
      message:   'Escaneie o QR Code para conectar',
    })

  } catch (error) {
    console.error('[WhatsApp Connect] ❌ Fatal error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro ao conectar WhatsApp',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
