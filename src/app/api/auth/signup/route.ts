import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, agencyName, ownerName } = await request.json()

    if (!email || !password || !agencyName || !ownerName) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirma automático (sem e-mail de confirmação por ora)
      user_metadata: { full_name: ownerName },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
      }
      throw authError
    }

    const userId = authData.user!.id

    // 2. Criar a agência
    const slug = agencyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)

    const { data: agency, error: agencyError } = await admin
      .from('agencies')
      .insert({ name: agencyName, slug: `${slug}-${Date.now()}` })
      .select('id')
      .single()

    if (agencyError) throw agencyError

    // 3. Vincular usuário à agência como admin
    const { error: linkError } = await admin
      .from('agency_users')
      .insert({ agency_id: agency.id, user_id: userId, role: 'admin' })

    if (linkError) throw linkError

    return NextResponse.json({ success: true, agencyId: agency.id })

  } catch (error) {
    console.error('[signup]', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar conta. Tente novamente.' },
      { status: 500 }
    )
  }
}
