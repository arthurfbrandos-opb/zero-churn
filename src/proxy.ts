import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login', '/cadastro', '/recuperar-senha']
const PUBLIC_PREFIXES = [
  '/f/',         // formulário público /f/[token]
  '/api/auth/',  // rotas de auth (signup, logout) não exigem sessão
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas — passa direto
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

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

  // Verifica sessão atual
  const { data: { session } } = await supabase.auth.getSession()

  // Não autenticado → redireciona para login
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Aplica proxy a todas as rotas exceto arquivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
