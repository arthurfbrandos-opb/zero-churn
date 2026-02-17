import { NextResponse } from 'next/server'

// Rota temporária de diagnóstico — REMOVER após confirmar que tudo funciona
export async function GET() {
  return NextResponse.json({
    supabase_url:      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon:     !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role:      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    encryption_secret: !!process.env.ENCRYPTION_SECRET,
    app_url:           process.env.NEXT_PUBLIC_APP_URL ?? 'não definido',
    node_env:          process.env.NODE_ENV,
    // Primeiros 10 chars da service role para confirmar qual chave está carregada
    service_role_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) ?? 'vazio',
  })
}
