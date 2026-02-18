/**
 * POST /api/whatsapp/instance/connect
 *
 * Cria (ou reconecta) a instância WhatsApp da agência e retorna o QR Code.
 * O QR Code expira em ~45 segundos no WhatsApp — o cliente deve mostrar
 * um botão de "Atualizar QR" para renovar.
 *
 * Response:
 *   { qrCode: string (base64 data URL) }  — quando aguardando scan
 *   { connected: true, phone: string }     — quando já conectado
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getSystemEvolutionConfig,
  isEvolutionConfigured,
  createInstance,
  getInstanceQRCode,
  getInstanceStatus,
  registerWebhook,
} from '@/lib/evolution/client'
import {
  instanceNameForAgency,
  saveAgencyEvolutionRecord,
} from '@/lib/evolution/agency-config'
import { toErrorMsg } from '@/lib/utils'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verifica se servidor Evolution está configurado
    if (!isEvolutionConfigured()) {
      return NextResponse.json(
        { error: 'Servidor WhatsApp não configurado. Entre em contato com o suporte.' },
        { status: 503 }
      )
    }

    // Busca agência
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const { agency_id } = agencyUser
    const instanceName  = instanceNameForAgency(agency_id)
    const config        = getSystemEvolutionConfig(instanceName)

    // Tenta criar instância (ignora erro se já existir)
    try {
      await createInstance(config)
    } catch (e) {
      const msg = toErrorMsg(e)
      // 'already exists' ou similar — não é erro real
      if (!msg.includes('400') && !msg.includes('exists') && !msg.includes('already')) {
        throw e
      }
    }

    // Verifica se já está conectado
    const status = await getInstanceStatus(config)
    if (status.connected) {
      // Já conectado — salva/atualiza registro
      await saveAgencyEvolutionRecord(supabase, agency_id, instanceName, {
        phoneNumber: status.phone,
        connectedAt: new Date().toISOString(),
        status:      'active',
      })
      return NextResponse.json({ connected: true, phone: status.phone })
    }

    // Registra webhook (se ainda não registrado)
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zero-churn.vercel.app'
    const webhookUrl = `${appUrl}/api/whatsapp/webhook`
    try { await registerWebhook(config, webhookUrl) } catch { /* ignora */ }

    // Obtém QR Code
    const qrBase64 = await getInstanceQRCode(config)
    if (!qrBase64) {
      return NextResponse.json(
        { error: 'Não foi possível gerar o QR Code. Tente novamente.' },
        { status: 500 }
      )
    }

    // Salva instância como pendente
    await saveAgencyEvolutionRecord(supabase, agency_id, instanceName, { status: 'error' })

    // Formata como data URL se vier só o base64
    const qrCode = qrBase64.startsWith('data:')
      ? qrBase64
      : `data:image/png;base64,${qrBase64}`

    return NextResponse.json({ connected: false, qrCode })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[whatsapp/instance/connect]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
