# ⏰ Cron Jobs — Zero Churn

Todos os cron jobs são executados automaticamente pelo Vercel e protegidos por `CRON_SECRET`.

## 📋 Lista de Crons

| Cron | Frequência | Horário | Descrição |
|------|-----------|---------|-----------|
| **monthly-analysis** | Diário | 9h UTC (6h BRT) | Executa análise de Health Score dos clientes de cada agência no dia da semana configurado |
| **form-reminders** | Diário | 8h UTC (5h BRT) | Envia lembretes de formulários NPS pendentes |
| **check-integrations** | Semanal (segunda) | 8h UTC (5h BRT) | Verifica status das integrações e envia alertas se houver problemas |
| **purge-messages** | Semanal (domingo) | 3h UTC (0h BRT) | Remove mensagens antigas do WhatsApp (> 90 dias) |
| **sync-mrr** | Mensal (dia 1) | 4h UTC (1h BRT) | Sincroniza MRR de clientes com Asaas (atualiza contract_value) |

---

## 🆕 sync-mrr

**Endpoint:** `/api/cron/sync-mrr`  
**Frequência:** Mensal (dia 1 às 4h UTC)  
**Criado em:** 20/02/2026

### Objetivo

Mantém o campo `contract_value` sincronizado com as subscriptions ativas do Asaas, garantindo que valores estejam corretos mesmo quando há upgrades/downgrades de preço agendados.

### Como funciona

1. Busca todos os clientes com integração Asaas ativa
2. Para cada cliente:
   - Busca subscriptions ativas na API do Asaas
   - Se houver múltiplas (ex: upgrade agendado), pega a **vigente** (nextDueDate mais próximo)
   - Calcula o MRR mensal
   - Atualiza `contract_value` no banco **apenas se mudou**
3. Retorna resumo: `{ total, processed, updated, skipped, errors }`

### Exemplo de caso de uso

**Cliente:** ODONTOLOGIA INTEGRADA  
**Subscriptions no Asaas:**
- Sub 1: R$ 2.500/mês (nextDueDate: 01/04/2026)
- Sub 2: R$ 3.500/mês (nextDueDate: 01/06/2026)

**Comportamento do cron:**
- **Fevereiro-Abril:** Pega Sub 1 → `contract_value = 2500`
- **Maio em diante:** Pega Sub 2 → `contract_value = 3500`

### Logs

```
[cron/sync-mrr] 🚀 Iniciando sincronização mensal de MRR
[cron/sync-mrr] 📊 45 clientes com integração Asaas encontrados
[cron/sync-mrr] 🔑 5 API keys descriptografadas
[cron/sync-mrr] ✅ Cliente A: null → R$ 2500
[cron/sync-mrr] ⏭️ Cliente B: R$ 1500 (sem mudança)
[cron/sync-mrr] ✅ Cliente C: 3000 → R$ 3500
[cron/sync-mrr] ✅ Sincronização concluída em 23s
[cron/sync-mrr] 📊 Total: 45 | Processados: 45 | Atualizados: 12 | Sem mudança: 31 | Erros: 2
```

### Teste manual

```bash
curl -X GET https://zerochurn.brandosystem.com/api/cron/sync-mrr \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Resposta esperada:**
```json
{
  "success": true,
  "summary": {
    "total": 45,
    "processed": 45,
    "updated": 12,
    "skipped": 31,
    "errors": 2,
    "durationSeconds": 23
  },
  "timestamp": "2026-02-20T04:00:00.000Z"
}
```

---

## 🔐 Segurança

Todos os crons verificam o header:
```
Authorization: Bearer ${CRON_SECRET}
```

Sem o secret correto, retornam **401 Unauthorized**.

O `CRON_SECRET` é injetado automaticamente pelo Vercel em produção e deve estar configurado em `.env.local` para testes locais.

---

## 🧪 Testar localmente

```bash
# 1. Configure o CRON_SECRET no .env.local
echo "CRON_SECRET=seu-secret-aqui" >> .env.local

# 2. Rode o servidor
npm run dev

# 3. Chame o cron manualmente
curl -X GET http://localhost:3000/api/cron/sync-mrr \
  -H "Authorization: Bearer seu-secret-aqui"
```

---

## 📝 Adicionar novo cron

1. Crie o arquivo em `src/app/api/cron/nome-do-cron/route.ts`
2. Implemente a lógica seguindo o padrão (verificar `isAuthorized()`)
3. Adicione ao `vercel.json`:
   ```json
   {
     "path": "/api/cron/nome-do-cron",
     "schedule": "0 12 * * *"
   }
   ```
4. Documente neste arquivo

### Sintaxe do schedule (cron expression)

```
┌───────────── minuto (0-59)
│ ┌─────────── hora (0-23)
│ │ ┌───────── dia do mês (1-31)
│ │ │ ┌─────── mês (1-12)
│ │ │ │ ┌───── dia da semana (0-6) (0=Dom, 6=Sáb)
│ │ │ │ │
* * * * *
```

**Exemplos:**
- `0 9 * * *` — Diário às 9h
- `0 8 * * 1` — Toda segunda às 8h
- `0 4 1 * *` — Todo dia 1 do mês às 4h
- `*/30 * * * *` — A cada 30 minutos

---

## 🔗 Referências

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Cron Expression Generator](https://crontab.guru/)
