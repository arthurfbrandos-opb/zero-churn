/**
 * GET /api/whatsapp/server-status
 *
 * Verifica se o servidor Evolution API do Zero Churn está online.
 * Retorna também o total de instâncias ativas.
 * Usado pela UI de Configurações para mostrar saúde da infra.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isEvolutionConfigured } from '@/lib/evolution/client'
import { toErrorMsg } from '@/lib/utils'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    if (!isEvolutionConfigured()) {
      return NextResponse.json({ online: false, reason: 'not_configured' })
    }

    const url    = process.env.EVOLUTION_API_URL!
    const apiKey = process.env.EVOLUTION_API_KEY!

    const res = await fetch(`${url}/instance/fetchInstances`, {
      headers: { apikey: apiKey },
      signal:  AbortSignal.timeout(5000),
      next:    { revalidate: 0 },
    })

    if (!res.ok) return NextResponse.json({ online: false, reason: `HTTP ${res.status}` })

    const instances = await res.json() as unknown[]
    const active    = Array.isArray(instances)
      ? instances.filter((i: unknown) => {
          const inst = i as Record<string, unknown>
          return inst.connectionStatus === 'open' ||
            (inst.instance as Record<string,unknown>)?.state === 'open'
        }).length
      : 0

    return NextResponse.json({
      online:    true,
      total:     Array.isArray(instances) ? instances.length : 0,
      active,
      serverUrl: url,
    })
  } catch (err) {
    return NextResponse.json({ online: false, reason: toErrorMsg(err) })
  }
}
