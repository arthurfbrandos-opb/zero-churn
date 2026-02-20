/**
 * GET /api/cron/sync-mrr
 *
 * Vercel Cron Job — roda mensalmente no dia 1 às 4h UTC.
 * 
 * Sincroniza o MRR (contract_value) de todos os clientes que possuem
 * integração Asaas, garantindo que valores estejam atualizados mesmo
 * quando há upgrades/downgrades de preço agendados.
 *
 * IMPORTANTE:
 * Se um cliente tem múltiplas subscriptions ativas (ex: upgrade agendado),
 * a função getCustomerMrr() pega automaticamente a subscription VIGENTE
 * baseada no nextDueDate mais próximo.
 *
 * EXEMPLO:
 * Cliente com 2 subscriptions:
 * - R$ 2.500/mês (nextDueDate: 01/04/2026)
 * - R$ 3.500/mês (nextDueDate: 01/06/2026)
 * 
 * Fevereiro-Abril: MRR = R$ 2.500
 * Maio em diante: MRR = R$ 3.500 (automaticamente)
 *
 * SEGURANÇA:
 * - Verifica header Authorization: Bearer ${CRON_SECRET}
 * - Sem o secret, retorna 401
 *
 * PROCESSAMENTO:
 * - Sequencial: 1 cliente por vez (evita sobrecarga de API Asaas)
 * - Apenas clientes com integração Asaas ativa
 * - Falhas individuais não interrompem o job
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/supabase/encryption'
import { getCustomerMrr } from '@/lib/asaas/client'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Verifica auth do cron (Vercel injeta CRON_SECRET automaticamente)
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const startTime = Date.now()
  
  console.log(`[cron/sync-mrr] 🚀 Iniciando sincronização mensal de MRR — ${new Date().toISOString()}`)

  try {
    // 1. Busca todas as integrações Asaas de clientes
    const { data: integrations, error: integError } = await supabase
      .from('client_integrations')
      .select('id, client_id, credentials, clients!inner(id, name, agency_id, contract_value, client_type)')
      .eq('type', 'asaas')
      .eq('status', 'connected')

    if (integError) {
      console.error('[cron/sync-mrr] ❌ Erro ao buscar integrações:', integError)
      return NextResponse.json({ error: 'Erro ao buscar integrações' }, { status: 500 })
    }

    if (!integrations || integrations.length === 0) {
      console.log('[cron/sync-mrr] ℹ️ Nenhuma integração Asaas encontrada')
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhuma integração Asaas para processar',
        processed: 0
      })
    }

    console.log(`[cron/sync-mrr] 📊 ${integrations.length} clientes com integração Asaas encontrados`)

    // 2. Agrupa por agência para buscar API keys
    const agencyIds = [...new Set(integrations.map(i => (i.clients as any).agency_id))]
    
    const { data: agencyKeys } = await supabase
      .from('agency_integrations')
      .select('agency_id, encrypted_key')
      .eq('type', 'asaas')
      .eq('status', 'active')
      .in('agency_id', agencyIds)

    const apiKeysByAgency = new Map<string, string>()
    
    // 3. Descriptografa todas as API keys
    for (const ak of agencyKeys || []) {
      try {
        const { api_key } = await decrypt<{ api_key: string }>(ak.encrypted_key)
        apiKeysByAgency.set(ak.agency_id, api_key)
      } catch (err) {
        console.error(`[cron/sync-mrr] ❌ Erro ao descriptografar API key da agência ${ak.agency_id}:`, err)
      }
    }

    console.log(`[cron/sync-mrr] 🔑 ${apiKeysByAgency.size} API keys descriptografadas`)

    // 4. Processa cada cliente
    let processed = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const integration of integrations) {
      const client = integration.clients as any
      const customerId = (integration.credentials as any)?.customer_id

      if (!customerId) {
        console.warn(`[cron/sync-mrr] ⚠️ Cliente ${client.name} sem customer_id`)
        skipped++
        continue
      }

      const apiKey = apiKeysByAgency.get(client.agency_id)
      if (!apiKey) {
        console.warn(`[cron/sync-mrr] ⚠️ Cliente ${client.name} sem API key da agência`)
        skipped++
        continue
      }

      try {
        // Calcula MRR atual do Asaas
        const mrrCalculado = await getCustomerMrr(apiKey, customerId)
        
        // Só atualiza se for diferente (evita writes desnecessários)
        if (client.contract_value !== mrrCalculado) {
          const { error: updateError } = await supabase
            .from('clients')
            .update({ contract_value: mrrCalculado })
            .eq('id', client.id)

          if (updateError) {
            console.error(`[cron/sync-mrr] ❌ Erro ao atualizar ${client.name}:`, updateError)
            errors++
          } else {
            console.log(`[cron/sync-mrr] ✅ ${client.name}: ${client.contract_value || 'null'} → R$ ${mrrCalculado}`)
            updated++
          }
        } else {
          console.log(`[cron/sync-mrr] ⏭️ ${client.name}: R$ ${mrrCalculado} (sem mudança)`)
          skipped++
        }

        processed++

      } catch (err) {
        console.error(`[cron/sync-mrr] ❌ Erro ao processar ${client.name}:`, err)
        errors++
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)

    console.log(`[cron/sync-mrr] ✅ Sincronização concluída em ${duration}s`)
    console.log(`[cron/sync-mrr] 📊 Total: ${integrations.length} | Processados: ${processed} | Atualizados: ${updated} | Sem mudança: ${skipped} | Erros: ${errors}`)

    return NextResponse.json({
      success: true,
      summary: {
        total: integrations.length,
        processed,
        updated,
        skipped,
        errors,
        durationSeconds: duration
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[cron/sync-mrr] ❌ Erro fatal:', error)
    return NextResponse.json({
      error: 'Erro ao processar sincronização',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos
