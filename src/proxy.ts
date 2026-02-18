/**
 * proxy.ts — Next.js 16 (substitui middleware.ts)
 *
 * Roda no Edge antes de cada request. Responsabilidades:
 *   1. Atualiza sessão do Supabase (refresh token automático)
 *   2. Redireciona rotas protegidas → /login se não autenticado
 *   3. Redireciona /login e /cadastro → /dashboard se já autenticado
 *
 * Rotas públicas: /login, /cadastro, /recuperar-senha, /redefinir-senha,
 *                 /verificar-email, /auth/callback, /f/[token] (NPS público)
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que qualquer pessoa pode acessar sem estar logada
const PUBLIC_ROUTES = [
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/redefinir-senha',
  '/verificar-email',
]

// Prefixos públicos
const PUBLIC_PREFIXES = [
  '/f/',          // formulário NPS público /f/[token]
  '/api/auth/',   // signup, logout
  '/auth/',       // callback PKCE do Supabase
]

// Rotas que usuários autenticados não devem ver
const AUTH_ONLY_ROUTES = ['/login', '/cadastro']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute  = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?'))
  const isPublicPrefix = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthRoute    = AUTH_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?'))

  // Arquivos estáticos e prefixos sempre públicos — passa direto
  if (isPublicPrefix) return NextResponse.next()

  // Cria response mutável para o Supabase poder setar cookies de sessão
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida o token no servidor (nunca usa cache local)
  // Também faz refresh automático do access token quando necessário
  const { data: { user } } = await supabase.auth.getUser()

  // Usuário autenticado tentando acessar /login ou /cadastro → dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Usuário não autenticado tentando acessar rota protegida → login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
