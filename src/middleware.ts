/**
 * Middleware de proteção de rotas — Next.js + Supabase SSR
 *
 * Roda no Edge antes de cada request. Responsabilidades:
 *   1. Atualiza a sessão do usuário (refresh token quando necessário)
 *   2. Redireciona rotas protegidas para /login se não autenticado
 *   3. Redireciona /login e /cadastro para /dashboard se já autenticado
 *
 * Rotas públicas (sem proteção):
 *   /login, /cadastro, /recuperar-senha, /redefinir-senha,
 *   /verificar-email, /auth/callback, /f/[token] (formulário público)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rotas que qualquer pessoa pode acessar sem estar logada
const PUBLIC_ROUTES = [
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/redefinir-senha',
  '/verificar-email',
  '/auth/callback',
]

// Prefixos públicos (ex: /f/qualquer-token)
const PUBLIC_PREFIXES = ['/f/']

// Rotas que usuários já autenticados não devem ver
const AUTH_ROUTES = ['/login', '/cadastro']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignora arquivos estáticos e rotas internas do Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')   ||
    pathname.includes('.')         // arquivos com extensão (favicon.ico, etc.)
  ) {
    return NextResponse.next()
  }

  // Verifica se é rota pública por prefixo
  const isPublicPrefix = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  if (isPublicPrefix) return NextResponse.next()

  // Cria response mutável para o Supabase poder atualizar cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Aplica cookies tanto no request quanto no response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Tenta obter o usuário — também faz refresh do token se necessário
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  const isAuthRoute   = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  // Usuário autenticado tentando acessar /login ou /cadastro → manda pro dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Usuário NÃO autenticado tentando acessar rota protegida → manda pro login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    // Preserva o destino original para redirecionar após o login
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todos os paths exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
