# 🧪 Teste de Análise Manual — Debug no_payment_data

## 📋 Cliente de teste
- **Nome:** ODONTOLOGIA INTEGRADA
- **ID:** `226cca28-d8f3-4dc5-8c92-6c9e4753a1ce`
- **Asaas customer:** `cus_000155163105`
- **Problema:** Flag `no_payment_data` aparece mesmo com Asaas conectado

## 🔑 Como obter o token de autenticação

### Método 1: Via Browser (recomendado)
1. Acessar https://zerochurn.brandosystem.com
2. Fazer login com:
   - Email: `arthur@emadigital.com.br`
   - Senha: `@Rthur1801`
3. Abrir DevTools (F12 ou Cmd+Option+I)
4. Ir em **Application** → **Cookies** → `zerochurn.brandosystem.com`
5. Copiar o **valor completo** do cookie `sb-hvpsxypzylqruuufbtxz-auth-token`
   - Formato: `base64.base64.base64-xxx-xxxx`

### Método 2: Via console do browser
```javascript
document.cookie.split('; ').find(c => c.startsWith('sb-hvpsxypzylqruuufbtxz-auth-token='))?.split('=')[1]
```

## 🚀 Opção 1: Script bash (recomendado)

```bash
# 1. Exportar o token
export AUTH_TOKEN="seu_token_aqui"

# 2. Executar o script
bash zero-churn/test-analysis.sh
```

## 🚀 Opção 2: Comando curl direto

```bash
curl -X POST \
  -H "Cookie: sb-hvpsxypzylqruuufbtxz-auth-token=SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\nTempo: %{time_total}s\n" \
  "https://zerochurn.brandosystem.com/api/analysis/226cca28-d8f3-4dc5-8c92-6c9e4753a1ce" \
  | jq '.'
```

## 🔎 Onde ver os logs

### Vercel Logs (produção)
1. Acessar: https://vercel.com/arthurfbrandos-opb/zero-churn/logs
2. Filtrar por: `data-fetcher`
3. Procurar por:
   - `[data-fetcher] START:`
   - `[data-fetcher] Asaas integ:`
   - `[data-fetcher] Asaas batch:`
   - `[data-fetcher] Total Asaas payments collected`

### Logs esperados (se bug for confirmado)
```
[data-fetcher] START: clientId=226cca28-..., period=2025-12-20 to 2026-02-19
[data-fetcher] asaasIntegs=1, domIntegs=0
[data-fetcher] fetchAsaasPayments: 1 integrations, period=2025-12-20 to 2026-02-19
[data-fetcher] Asaas integ: { type: 'asaas', status: 'connected', hasCredentials: true, customerId: 'cus_000155163105', credentials: {...} }
[data-fetcher] Asaas batch: 1 pagamentos
[data-fetcher] Total Asaas payments collected for customer cus_000155163105: 1
[data-fetcher] fetchAsaasPayments FINAL: 1 total payments
```

Se aparecer `0 total payments`, o problema está na API do Asaas.
Se aparecer `1 total payments` mas ainda tiver flag `no_payment_data`, o problema está no agente financeiro.

## 📊 Resultado esperado

### ✅ Sucesso
```json
{
  "success": true,
  "analysisId": "uuid-da-analise",
  "result": {
    "scoreTotal": 50,
    "scoreFinanceiro": 100,
    "churnRisk": "medium",
    "flags": [],
    "agentsLog": {
      "financeiro": {
        "score": 100,
        "flags": [],
        "details": {
          "totalPayments": 1,
          "received": 1
        }
      }
    }
  }
}
```

### ❌ Bug confirmado
```json
{
  "result": {
    "flags": ["no_payment_data"],
    "agentsLog": {
      "financeiro": {
        "score": null,
        "flags": ["no_payment_data"],
        "status": "skipped"
      }
    }
  }
}
```

## 🛠️ Troubleshooting

### Erro 401 (Não autenticado)
- Token expirado ou inválido
- Fazer logout/login novamente e pegar novo token

### Erro 404 (Cliente não encontrado)
- Verificar se o cliente existe no banco
- Verificar agency_id do usuário logado

### Timeout (>60s)
- Normal para primeira análise (coleta de dados)
- Vercel tem limite de 60s no plano Pro

### Flag no_payment_data mesmo com logs OK
- Bug está no agente financeiro (não no data-fetcher)
- Verificar lógica em `src/lib/agents/financeiro.ts`
