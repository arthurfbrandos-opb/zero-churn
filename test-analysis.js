/**
 * Script de teste — dispara análise manual e exibe logs completos
 * 
 * Uso:
 *   node test-analysis.js
 * 
 * Cliente testado: ODONTOLOGIA INTEGRADA (226cca28-d8f3-4dc5-8c92-6c9e4753a1ce)
 */

const CLIENT_ID = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
const API_BASE = 'https://zerochurn.brandosystem.com'

// Cookie de autenticação (pegar do browser após login)
// Formato: sb-hvpsxypzylqruuufbtxz-auth-token=base64.base64.base64
const AUTH_COOKIE = process.env.AUTH_COOKIE || ''

async function testAnalysis() {
  if (!AUTH_COOKIE) {
    console.error('❌ AUTH_COOKIE não definido')
    console.log('📝 Para obter:')
    console.log('  1. Fazer login em https://zerochurn.brandosystem.com')
    console.log('  2. Abrir DevTools → Application → Cookies')
    console.log('  3. Copiar valor de "sb-hvpsxypzylqruuufbtxz-auth-token"')
    console.log('  4. Exportar: export AUTH_COOKIE="<valor>"')
    process.exit(1)
  }

  console.log('🔍 Iniciando análise manual...\n')
  console.log(`📊 Cliente: ${CLIENT_ID}`)
  console.log(`🌐 Endpoint: ${API_BASE}/api/analysis/${CLIENT_ID}\n`)

  try {
    const res = await fetch(`${API_BASE}/api/analysis/${CLIENT_ID}`, {
      method: 'POST',
      headers: {
        'Cookie': `sb-hvpsxypzylqruuufbtxz-auth-token=${AUTH_COOKIE}`,
        'Content-Type': 'application/json',
      },
    })

    console.log(`📡 Status: ${res.status} ${res.statusText}\n`)

    const data = await res.json()

    if (!res.ok) {
      console.error('❌ Erro:', data)
      process.exit(1)
    }

    console.log('✅ Análise concluída!\n')
    console.log('📈 Resultado:')
    console.log(JSON.stringify(data, null, 2))

    // Extrai flags críticos
    if (data.result?.flags?.length > 0) {
      console.log('\n⚠️  Flags detectados:')
      data.result.flags.forEach(f => console.log(`   - ${f}`))
    }

    // Verifica no_payment_data
    if (data.result?.flags?.includes('no_payment_data')) {
      console.log('\n🔴 BUG CONFIRMADO: no_payment_data flag presente mesmo com Asaas conectado')
      
      console.log('\n🔎 Debug:')
      console.log('   Financeiro:', data.result?.agentsLog?.financeiro)
    }

  } catch (err) {
    console.error('❌ Erro na requisição:', err.message)
    process.exit(1)
  }
}

testAnalysis()
