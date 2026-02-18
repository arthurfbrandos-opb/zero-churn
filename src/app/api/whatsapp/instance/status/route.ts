/**
 * GET /api/whatsapp/instance/status
 *
 * Retorna o estado de conexão da instância WhatsApp da agência.
 * Usado para polling após exibir o QR Code.
 *
 * Response:
 *   { connected: true,  phone: "5511999999999" }
 *   { connected: false, state: "connecting" | "close" | "unknown" }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isEvolutionConfigured, getSystemEvolutionConfig, getInstanceStatus } from '@/lib/evolution/client'
import { instanceNameForAgency, saveAgencyEvolutionRecord } from '@/lib/evolution/agency-config'
import { toErrorMsg } from '@/lib/utils'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    if (!isEvolutionConfigured()) {
      return NextResponse.json({ connected: false, state: 'not_configured' })
    }

    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const instanceName = instanceNameForAgency(agencyUser.agency_id)
    const config       = getSystemEvolutionConfig(instanceName)

    const status = await getInstanceStatus(config)

    // Se acabou de conectar, persiste no banco
    if (status.connected && status.phone) {
      await saveAgencyEvolutionRecord(supabase, agencyUser.agency_id, instanceName, {
        phoneNumber: status.phone,
        connectedAt: new Date().toISOString(),
        status:      'active',
      })
    }

    return NextResponse.json({
      connected: status.connected,
      state:     status.state,
      phone:     status.phone ?? null,
    })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[whatsapp/instance/status]', msg)
    return NextResponse.json({ connected: false, state: 'error', error: msg }, { status: 500 })
  }
}
