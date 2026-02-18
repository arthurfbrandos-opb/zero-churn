/**
 * Obtém as credenciais da Evolution API de uma agência específica.
 * Credenciais ficam em agency_integrations (type = 'evolution_api'),
 * criptografadas no campo encrypted_key.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/supabase/encryption'
import type { EvolutionConfig } from './client'

export async function getAgencyEvolutionConfig(
  supabase:  SupabaseClient,
  agencyId:  string,
): Promise<EvolutionConfig | null> {
  const { data, error } = await supabase
    .from('agency_integrations')
    .select('encrypted_key')
    .eq('agency_id', agencyId)
    .eq('type', 'evolution_api')
    .eq('status', 'active')
    .single()

  if (error || !data?.encrypted_key) return null

  try {
    const creds = await decrypt<{
      url?:           string
      api_key?:       string
      instance_name?: string
    }>(data.encrypted_key)

    if (!creds.url || !creds.api_key || !creds.instance_name) return null

    return {
      url:          creds.url.replace(/\/$/, ''),
      apiKey:       creds.api_key,
      instanceName: creds.instance_name,
    }
  } catch {
    return null
  }
}
