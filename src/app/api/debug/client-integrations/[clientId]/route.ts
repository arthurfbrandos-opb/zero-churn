/**
 * GET /api/debug/client-integrations/[clientId]
 * 
 * Endpoint temporário de debug para verificar integrações do cliente
 * e chaves da agência.
 * 
 * REMOVER APÓS DEBUG!
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Busca agency_id
  const { data: au } = await supabase
    .from('agency_users')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!au?.agency_id) {
    return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
  }

  const agencyId = au.agency_id

  // Busca cliente com integrações
  const { data: client } = await supabase
    .from('clients')
    .select(`
      id, name,
      client_integrations ( * )
    `)
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  // Filtra integrações Asaas
  const asaasInteg = ((client.client_integrations as Array<Record<string, unknown>>) ?? [])
    .filter(i => i.type === 'asaas')

  // Busca chave da agência
  const { data: agencyAsaas } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('agency_id', agencyId)
    .eq('type', 'asaas')
    .maybeSingle()

  let apiKeyDecrypted: string | null = null
  let decryptError: string | null = null
  
  if (agencyAsaas?.encrypted_key) {
    try {
      apiKeyDecrypted = await decrypt<string>(agencyAsaas.encrypted_key)
    } catch (err) {
      decryptError = String(err)
    }
  }

  return NextResponse.json({
    clientId,
    clientName: client.name,
    agencyId,
    debug: {
      totalIntegrations: client.client_integrations?.length ?? 0,
      asaasIntegrations: asaasInteg.length,
      asaasDetails: asaasInteg.map(i => ({
        id: i.id,
        type: i.type,
        status: i.status,
        label: i.label,
        hasCredentials: !!i.credentials,
        credentials: i.credentials,
        hasCredentialsEnc: !!i.credentials_enc,
      })),
      agencyAsaasKey: {
        exists: !!agencyAsaas,
        status: agencyAsaas?.status,
        hasEncryptedKey: !!agencyAsaas?.encrypted_key,
        decrypted: apiKeyDecrypted ? `${apiKeyDecrypted.slice(0, 10)}...` : null,
        decryptError,
      }
    }
  })
}
