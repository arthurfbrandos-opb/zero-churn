/**
 * Gerenciamento de instâncias Evolution API por agência.
 *
 * Zero Churn hospeda um servidor Evolution API compartilhado (env vars).
 * Cada agência tem sua própria instância: nome = "agency_{agencyId}"
 *
 * O que fica no banco (tabela agencies - migration 016):
 *   - whatsapp_instance_name: nome da instância (ex: agency_694e9e9e-8e69-42b8-9953-c3d9595676b9)
 *   - whatsapp_phone: número conectado (ex: 5511999999999)
 *   - whatsapp_connected_at: timestamp da última conexão
 *
 * A URL e API Key do servidor vêm sempre das env vars — agências nunca tocam nisso.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getSystemEvolutionConfig, isEvolutionConfigured } from './client'
import type { EvolutionConfig } from './client'

// Nome de instância baseado no agencyId (curto, URL-safe)
export function instanceNameForAgency(agencyId: string): string {
  return `agency_${agencyId}`
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
 * 
 * ATUALIZADO: Usa tabela agencies (migration 016) em vez de agency_integrations
 */
export async function getAgencyEvolutionConfig(
  supabase:  SupabaseClient,
  agencyId:  string,
): Promise<EvolutionConfig | null> {
  if (!isEvolutionConfigured()) return null

  // Pega nome da instância do banco (migration 016 - tabela agencies)
  const { data } = await supabase
    .from('agencies')
    .select('whatsapp_instance_name')
    .eq('id', agencyId)
    .maybeSingle()

  // Usa instance_name do banco ou gera padrão
  const instanceName = data?.whatsapp_instance_name || `agency_${agencyId}`

  return getSystemEvolutionConfig(instanceName)
}

/**
 * Retorna detalhes da integração WhatsApp da agência (status, número).
 * 
 * ATUALIZADO: Usa tabela agencies (migration 016)
 */
export async function getAgencyEvolutionRecord(
  supabase:  SupabaseClient,
  agencyId:  string,
): Promise<AgencyEvolutionRecord | null> {
  const { data } = await supabase
    .from('agencies')
    .select('whatsapp_instance_name, whatsapp_phone, whatsapp_connected_at')
    .eq('id', agencyId)
    .maybeSingle()

  if (!data) return null

  const hasWhatsApp = !!data.whatsapp_instance_name || !!data.whatsapp_phone

  return {
    instanceName: data.whatsapp_instance_name ?? `agency_${agencyId}`,
    phoneNumber:  data.whatsapp_phone ?? undefined,
    connectedAt:  data.whatsapp_connected_at ?? undefined,
    status:       data.whatsapp_connected_at ? 'connected' : (hasWhatsApp ? 'pending' : 'disconnected'),
  }
}

// ── Escrita ───────────────────────────────────────────────────────

/**
 * Salva/atualiza o registro da instância no banco.
 * 
 * ATUALIZADO: Usa tabela agencies (migration 016) - mais simples, sem criptografia
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
  const update: {
    whatsapp_instance_name: string
    whatsapp_phone?: string | null
    whatsapp_connected_at?: string | null
  } = {
    whatsapp_instance_name: instanceName,
  }

  if (opts?.phoneNumber !== undefined) {
    update.whatsapp_phone = opts.phoneNumber
  }

  if (opts?.connectedAt !== undefined) {
    update.whatsapp_connected_at = opts.connectedAt
  } else if (opts?.status === 'disconnected') {
    // Se está desconectando, limpa a data
    update.whatsapp_connected_at = null
  }

  await supabase
    .from('agencies')
    .update(update)
    .eq('id', agencyId)
}
