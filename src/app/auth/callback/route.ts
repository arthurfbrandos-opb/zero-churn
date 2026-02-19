/**
 * GET /auth/callback
 *
 * Handler do fluxo PKCE do Supabase.
 * Chamado quando o Supabase redireciona após:
 *  - Confirmação de e-mail de novo cadastro (type=signup)
 *  - Link de redefinição de senha           (type=recovery)
 *  - Troca de e-mail                        (type=email_change)
 *
 * Configure no Supabase Dashboard → Auth → URL Configuration:
 *   Site URL:    https://zerochurn.brandosystem.com
 *   Redirect URLs: https://zerochurn.brandosystem.com/auth/callback
 *                  http://localhost:3000/auth/callback
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code       = searchParams.get('code')
  const type       = searchParams.get('type') // 'signup' | 'recovery' | 'email_change'
  const tokenHash  = searchParams.get('token_hash')
  const errorParam = searchParams.get('error')
  const errorDesc  = searchParams.get('error_description')

  // Supabase reportou erro diretamente na URL
  if (errorParam) {
    const msg = encodeURIComponent(errorDesc ?? errorParam)
    return NextResponse.redirect(`${origin}/login?error=${msg}`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // ── Fluxo com code (PKCE) ──────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Link inválido ou expirado')}`)
    }
    // Redefinição de senha → manda para a tela de nova senha (sessão já ativa)
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/redefinir-senha`)
    }
    // Confirmação de cadastro → dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // ── Fluxo com token_hash (e-mails de verificação legados) ──────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'signup' | 'recovery' | 'email_change' | 'invite' })
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Link inválido ou expirado')}`)
    }
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/redefinir-senha`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Nenhum parâmetro válido
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Link de acesso inválido')}`)
}
