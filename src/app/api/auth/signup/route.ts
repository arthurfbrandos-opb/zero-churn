import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, agencyName, ownerName } = body

    if (!email || !password || !agencyName || !ownerName) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Criar usuário no Supabase Auth
    console.log('[signup] criando usuario:', email)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: ownerName },
    })

    if (authError) {
      console.error('[signup] erro auth:', authError)
      if (authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already exists')) {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user!.id
    console.log('[signup] usuario criado:', userId)

    // 2. Criar agência
    const slug = `${agencyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)}-${Date.now()}`

    console.log('[signup] criando agencia:', agencyName)
    const { data: agency, error: agencyError } = await admin
      .from('agencies')
      .insert({ name: agencyName, slug })
      .select('id')
      .single()

    if (agencyError) {
      console.error('[signup] erro agencia:', agencyError)
      // Tenta desfazer criação do usuário
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Erro ao criar agência: ' + agencyError.message }, { status: 500 })
    }

    console.log('[signup] agencia criada:', agency.id)

    // 3. Vincular usuário à agência
    const { error: linkError } = await admin
      .from('agency_users')
      .insert({ agency_id: agency.id, user_id: userId, role: 'admin' })

    if (linkError) {
      console.error('[signup] erro vincular:', linkError)
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Erro ao configurar conta: ' + linkError.message }, { status: 500 })
    }

    console.log('[signup] sucesso para:', email)
    return NextResponse.json({ success: true, agencyId: agency.id })

  } catch (error) {
    console.error('[signup] erro inesperado:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Erro interno: ' + msg }, { status: 500 })
  }
}
