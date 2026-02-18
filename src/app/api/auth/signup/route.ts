import { toErrorMsg } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmailConfirmation } from '@/lib/email/resend'

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

    const admin  = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zerochurn.com.br'

    // 1. Criar usuário no Supabase Auth (sem envio automático de e-mail pelo admin API)
    console.log('[signup] criando usuario:', email)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: ownerName },
      // email_confirm: false → usuário fica pendente de confirmação
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

    // 4. Gera link de confirmação e envia e-mail via Resend
    // admin.generateLink não envia e-mail automaticamente — nós enviamos pelo Resend
    try {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type:     'signup',
        email,
        password,           // obrigatório para type='signup' no admin API
        options: {
          redirectTo: `${appUrl}/auth/callback`,
        },
      })

      if (linkError || !linkData?.properties?.action_link) {
        // Se falhar a geração do link, não bloqueia o cadastro.
        // O usuário pode usar "Reenviar e-mail" na tela /verificar-email.
        console.warn('[signup] generateLink falhou (não crítico):', linkError?.message)
      } else {
        const confirmUrl = linkData.properties.action_link
        const emailResult = await sendEmailConfirmation({
          to:         email,
          ownerName,
          agencyName,
          confirmUrl,
        })
        if (!emailResult.ok) {
          console.warn('[signup] sendEmailConfirmation falhou (não crítico):', emailResult.error)
        } else {
          console.log('[signup] e-mail de confirmação enviado:', emailResult.id)
        }
      }
    } catch (emailErr) {
      // Nunca bloqueia o cadastro por falha no e-mail
      console.warn('[signup] erro ao enviar e-mail (não crítico):', emailErr)
    }

    console.log('[signup] sucesso para:', email)
    return NextResponse.json({ success: true, agencyId: agency.id })

  } catch (error) {
    console.error('[signup] erro inesperado:', error)
    const msg = toErrorMsg(error)
    return NextResponse.json({ error: 'Erro interno: ' + msg }, { status: 500 })
  }
}
