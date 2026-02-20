import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/supabase/encryption'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Endpoint para testar descriptografia da API key
 * GET /api/debug/test-decrypt
 */
export async function GET() {
  const supabase = await createClient()
  
  const agencyId = '694e9e9e-8e69-42b8-9953-c3d9595676b9' // Clinisales
  
  try {
    // 1. Busca chave criptografada
    const { data: agencyAsaas, error } = await supabase
      .from('agency_integrations')
      .select('encrypted_key, status')
      .eq('agency_id', agencyId)
      .eq('type', 'asaas')
      .single()

    if (error || !agencyAsaas?.encrypted_key) {
      return NextResponse.json({ 
        error: 'API key não encontrada',
        details: error 
      }, { status: 404 })
    }

    // 2. Tenta descriptografar
    const apiKey = await decrypt<string>(agencyAsaas.encrypted_key)

    // 3. Testa chamada simples à API Asaas
    const ASAAS_BASE = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'
    
    const testRes = await fetch(`${ASAAS_BASE}/myAccount`, {
      headers: { 'access_token': apiKey },
      next: { revalidate: 0 },
    })

    const testData = await testRes.json()

    return NextResponse.json({
      agencyIntegration: {
        status: agencyAsaas.status,
        hasEncryptedKey: !!agencyAsaas.encrypted_key
      },
      decryption: {
        success: true,
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 10) + '...',
        keySuffix: '...' + apiKey.substring(apiKey.length - 4)
      },
      apiTest: {
        endpoint: `${ASAAS_BASE}/myAccount`,
        status: testRes.status,
        statusText: testRes.statusText,
        accountName: testData.name ?? null,
        accountEmail: testData.email ?? null,
        error: testData.errors?.[0]?.description ?? null
      },
      diagnostico: testRes.status === 200
        ? '✅ API key válida e funcionando!'
        : testRes.status === 401
          ? '❌ API key INVÁLIDA - precisa reconfigurar na agência'
          : `⚠️ Erro HTTP ${testRes.status}`
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Erro ao processar',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
