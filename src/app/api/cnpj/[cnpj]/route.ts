/**
 * GET /api/cnpj/[cnpj]
 * Proxy para BrasilAPI — evita CORS no browser e adiciona cache de borda.
 * Retorna dados enriquecidos: razão social, decisor, segmento, endereço, telefone.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lookupCnpj } from '@/lib/cnpj/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  // Autenticação obrigatória
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { cnpj } = await params
  const data = await lookupCnpj(cnpj)

  if (!data) {
    return NextResponse.json(
      { error: 'CNPJ não encontrado ou inválido' },
      { status: 404 }
    )
  }

  return NextResponse.json(data, {
    headers: {
      // Cache no edge 24h — dado da Receita muda raramente
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  })
}
