/**
 * GET  /api/agency/integrations       — lista integrações da agência (sem expor as chaves)
 * POST /api/agency/integrations       — salva/atualiza uma integração (criptografa a chave)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/supabase/encryption'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data, error } = await supabase
      .from('agency_integrations')
      .select('id, type, status, last_tested_at, updated_at')
      // nunca retorna encrypted_key para o frontend

    if (error) throw error

    return NextResponse.json({ integrations: data ?? [] })
  } catch (err) {
    console.error('[GET /api/agency/integrations]', err)
    return NextResponse.json({ error: 'Erro ao buscar integrações' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { type, credentials } = await req.json()
    // credentials = { api_key: '...' } ou { api_key: '...', base_url: '...' }

    if (!type || !credentials) {
      return NextResponse.json({ error: 'type e credentials são obrigatórios' }, { status: 400 })
    }

    // Busca agency_id
    const { data: agencyUser } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).single()
    if (!agencyUser) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    // Criptografa as credenciais
    const encrypted_key = await encrypt(credentials as Record<string, unknown>)

    // Testa a integração antes de salvar
    let status: 'active' | 'error' = 'active'
    try {
      if (type === 'asaas') {
        const res = await fetch(`${process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'}/customers?limit=1`, {
          headers: { 'access_token': credentials.api_key },
        })
        if (!res.ok) status = 'error'
      }
    } catch {
      status = 'error'
    }

    if (status === 'error') {
      return NextResponse.json({ error: 'Chave inválida — não conseguimos conectar ao Asaas' }, { status: 400 })
    }

    // Salva ou atualiza
    const { error: upsertErr } = await supabase
      .from('agency_integrations')
      .upsert({
        agency_id: agencyUser.agency_id,
        type,
        encrypted_key,
        status,
        last_tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agency_id,type' })

    if (upsertErr) throw upsertErr

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('[POST /api/agency/integrations]', err)
    return NextResponse.json({ error: 'Erro ao salvar integração' }, { status: 500 })
  }
}
