#!/bin/bash

# Script de teste — dispara análise manual via curl
# 
# Uso:
#   1. Exportar cookie de autenticação:
#      export AUTH_TOKEN="base64.base64.base64"
#   
#   2. Executar:
#      bash test-analysis.sh
#
# Para obter o AUTH_TOKEN:
#   1. Fazer login em https://zerochurn.brandosystem.com
#   2. Abrir DevTools → Application → Cookies
#   3. Copiar VALOR COMPLETO de "sb-hvpsxypzylqruuufbtxz-auth-token"
#   4. Exportar: export AUTH_TOKEN="<valor_completo>"

CLIENT_ID="226cca28-d8f3-4dc5-8c92-6c9e4753a1ce"
API_BASE="https://zerochurn.brandosystem.com"

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Erro: AUTH_TOKEN não definido"
  echo ""
  echo "📝 Para obter o token:"
  echo "  1. Fazer login em https://zerochurn.brandosystem.com"
  echo "  2. Abrir DevTools → Application → Cookies"
  echo "  3. Copiar VALOR COMPLETO de 'sb-hvpsxypzylqruuufbtxz-auth-token'"
  echo "  4. Exportar: export AUTH_TOKEN=\"<valor_completo>\""
  echo ""
  exit 1
fi

echo "🔍 Disparando análise manual..."
echo "📊 Cliente: ODONTOLOGIA INTEGRADA"
echo "🆔 ID: $CLIENT_ID"
echo "🌐 Endpoint: $API_BASE/api/analysis/$CLIENT_ID"
echo ""

# Dispara análise com logs detalhados
curl -X POST \
  -H "Cookie: sb-hvpsxypzylqruuufbtxz-auth-token=$AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\n\n📡 HTTP Status: %{http_code}\n⏱️  Tempo total: %{time_total}s\n" \
  "$API_BASE/api/analysis/$CLIENT_ID" | jq '.'

echo ""
echo "✅ Análise concluída!"
echo ""
echo "🔎 Para ver os logs no Vercel:"
echo "  https://vercel.com/arthurfbrandos-opb/zero-churn/logs"
echo ""
echo "💡 Buscar por: 'data-fetcher'"
