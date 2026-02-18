/**
 * DELETE /api/whatsapp/instance/disconnect
 *
 * Desconecta (logout) o número WhatsApp da instância da agência.
 * O número volta a funcionar normalmente no celular.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isEvolutionConfigured, getSystemEvolutionConfig, logoutInstance } from '@/lib/evolution/client'
import { instanceNameForAgency, saveAgencyEvolutionRecord } from '@/lib/evolution/agency-config'
import { toErrorMsg } from '@/lib/utils'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    if (!isEvolutionConfigured()) {
      return NextResponse.json({ error: 'Servidor WhatsApp não configurado.' }, { status: 503 })
    }

    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const instanceName = instanceNameForAgency(agencyUser.agency_id)
    const config       = getSystemEvolutionConfig(instanceName)

    // Faz logout na Evolution API
    try { await logoutInstance(config) } catch { /* instância pode não existir */ }

    // Atualiza banco como desconectado
    await saveAgencyEvolutionRecord(supabase, agencyUser.agency_id, instanceName, {
      status: 'disconnected',
    })

    return NextResponse.json({ disconnected: true })
  } catch (err) {
    const msg = toErrorMsg(err)
    console.error('[whatsapp/instance/disconnect]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
