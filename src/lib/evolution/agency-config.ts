/**
 * Gerenciamento de instâncias Evolution API por agência.
 *
 * Zero Churn hospeda um servidor Evolution API compartilhado (env vars).
 * Cada agência tem sua própria instância: nome = "agency-{agencyId[:8]}"
 *
 * O que fica no banco (agency_integrations.encrypted_key):
 *   { instance_name, phone_number?, connected_at? }
 *
 * A URL e API Key do servidor vêm sempre das env vars — agências nunca tocam nisso.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/supabase/encryption'
import { getSystemEvolutionConfig, isEvolutionConfigured } from './client'
import type { EvolutionConfig } from './client'

// Nome de instância baseado no agencyId (curto, URL-safe)
export function instanceNameForAgency(agencyId: string): string {
  return `agency-${agencyId.replace(/-/g, '').slice(0, 12)}`
}

// ── Leitura ───────────────────────────────────────────────────────

export interface AgencyEvolutionRecord {
  instanceName:  string
  phoneNumber?:  string
  connectedAt?:  string
  status:        'connected' | 'disconnected' | 'pending'
}

/**
 * Retorna a config Evolution da agência (sistema + instância do banco).
 * Retorna null se o servidor Evolution não estiver configurado.
 */
export async function getAgencyEvolutionConfig(
  supabase:  SupabaseClient,
  agencyId:  string,
): Promise<EvolutionConfig | null> {
  if (!isEvolutionConfigured()) return null

  // Pega nome da instância do banco (se já criada)
  const { data } = await supabase
    .from('agency_integrations')
    .select('encrypted_key')
    .eq('agency_id', agencyId)
    .eq('type', 'evolution_api')
    .maybeSingle()

  let instanceName = instanceNameForAgency(agencyId)

  if (data?.encrypted_key) {
    try {
      const creds = await decrypt<{ instance_name?: string }>(data.encrypted_key)
      if (creds.instance_name) instanceName = creds.instance_name
    } catch { /* usa o padrão */ }
  }

  return getSystemEvolutionConfig(instanceName)
}

/**
 * Retorna detalhes da integração WhatsApp da agência (status, número).
 */
export async function getAgencyEvolutionRecord(
  supabase:  SupabaseClient,
  agencyId:  string,
): Promise<AgencyEvolutionRecord | null> {
  const { data } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('agency_id', agencyId)
    .eq('type', 'evolution_api')
    .maybeSingle()

  if (!data?.encrypted_key) return null

  try {
    const creds = await decrypt<{
      instance_name?: string
      phone_number?:  string
      connected_at?:  string
    }>(data.encrypted_key)

    return {
      instanceName: creds.instance_name ?? instanceNameForAgency(agencyId),
      phoneNumber:  creds.phone_number,
      connectedAt:  creds.connected_at,
      status:       data.status === 'active' ? 'connected' : 'disconnected',
    }
  } catch {
    return null
  }
}

// ── Escrita ───────────────────────────────────────────────────────

/**
 * Salva/atualiza o registro da instância no banco.
 */
export async function saveAgencyEvolutionRecord(
  supabase:      SupabaseClient,
  agencyId:      string,
  instanceName:  string,
  opts?: {
    phoneNumber?: string
    connectedAt?: string
    status?:      'active' | 'error' | 'disconnected'
  },
): Promise<void> {
  const credentials = {
    instance_name: instanceName,
    phone_number:  opts?.phoneNumber,
    connected_at:  opts?.connectedAt,
  }
  const encrypted_key = await encrypt(credentials as Record<string, unknown>)

  await supabase
    .from('agency_integrations')
    .upsert({
      agency_id:      agencyId,
      type:           'evolution_api',
      encrypted_key,
      status:         opts?.status ?? 'active',
      last_tested_at: new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'agency_id,type' })
}
