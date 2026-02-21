import { NextRequest, NextResponse } from 'next/server'
import { getSystemEvolutionConfig, isEvolutionConfigured } from '@/lib/evolution/client'
import { createClient } from '@/lib/supabase/server'

/**
 * DEBUG: Testa conexão Evolution API e verifica instâncias
 * GET /api/whatsapp/debug
 */
export async function GET(request: NextRequest) {
  if (!isEvolutionConfigured()) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
  }

  try {
    const supabase = await createClient()
    
    // 1. Pega dados da agência
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('id, name, whatsapp_instance_name, whatsapp_phone, whatsapp_connected_at')
      .eq('id', user.user_metadata.agency_id)
      .single()

    if (!agency) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const instanceName = agency.whatsapp_instance_name || `agency_${agency.id}`
    const config = getSystemEvolutionConfig(instanceName)

    // 2. Testa conectividade com Evolution API
    const evolutionHealth = await fetch(`${config.url}/manager/health`, {
      headers: { apikey: config.apiKey },
    }).then(r => r.ok ? 'OK' : `ERROR ${r.status}`).catch(e => `FAILED: ${e.message}`)

    // 3. Lista todas as instâncias do servidor
    const allInstancesRes = await fetch(`${config.url}/instance/fetchInstances`, {
      headers: { apikey: config.apiKey },
    })
    const allInstances = allInstancesRes.ok ? await allInstancesRes.json() : { error: await allInstancesRes.text() }

    // 4. Testa status da instância da agência
    let instanceStatus = null
    try {
      const statusRes = await fetch(`${config.url}/instance/connectionState/${instanceName}`, {
        headers: { apikey: config.apiKey },
      })
      instanceStatus = statusRes.ok ? await statusRes.json() : { error: await statusRes.text() }
    } catch (e: unknown) {
      instanceStatus = { error: e instanceof Error ? e.message : 'Unknown error' }
    }

    // 5. Tenta pegar QR Code (se disponível)
    let qrCode = null
    try {
      const qrRes = await fetch(`${config.url}/instance/connect/${instanceName}`, {
        headers: { apikey: config.apiKey },
      })
      const qrData = qrRes.ok ? await qrRes.json() : null
      qrCode = qrData?.base64 || qrData?.code || qrData?.qrcode || null
    } catch (e: unknown) {
      qrCode = { error: e instanceof Error ? e.message : 'Unknown error' }
    }

    return NextResponse.json({
      evolution: {
        url: config.url,
        apiKeyConfigured: !!config.apiKey,
        health: evolutionHealth,
      },
      agency: {
        id: agency.id,
        name: agency.name,
        instanceName,
        dbPhone: agency.whatsapp_phone,
        dbConnectedAt: agency.whatsapp_connected_at,
      },
      instance: {
        status: instanceStatus,
        qrCode: qrCode ? (typeof qrCode === 'string' ? '✅ Available' : qrCode) : null,
      },
      allInstances: Array.isArray(allInstances) 
        ? allInstances.map((i: { instance: { instanceName: string; state: string } }) => ({
            name: i.instance?.instanceName,
            state: i.instance?.state,
          }))
        : allInstances,
    })
  } catch (error: unknown) {
    console.error('[WhatsApp Debug] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined 
    }, { status: 500 })
  }
}
