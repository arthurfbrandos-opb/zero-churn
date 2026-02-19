# Zero Churn — Contexto do Projeto para o Agente

## O que é
SaaS B2B para agências digitais. Monitora saúde dos clientes via **Health Score** com IA (GPT-4o), prevenindo churn. Multitenancy: cada agência tem seus clientes, integrações e análises isoladas.

## Stack
- **Frontend/Backend:** Next.js 16.1.6 App Router (TypeScript)
- **Banco:** Supabase (Postgres + Auth + RLS + Storage)
- **Deploy:** Vercel → `zerochurn.brandosystem.com` (push `main` = auto deploy ~2 min)
- **E-mail:** Resend (por agência + fallback env vars)
- **IA:** OpenAI GPT-4o — internalized, sem BYOK
- **Financeiro:** Asaas API + Dom Pagamentos API
- **WhatsApp:** Evolution API v2.3.0 (servidor dedicado Zero Churn)

## Acessos
- **GitHub:** `https://github.com/arthurfbrandos-opb/zero-churn.git`
- **Prod:** `https://zerochurn.brandosystem.com`
- **Local:** `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn/`
- **Supabase:** projeto `hvpsxypzylqruuufbtxz`, PAT `sbp_44c3edcbe18b75e94fa90aedf7f229ba5b95649a`
- **Portainer:** `painel.emadigital.com.br` — admin / `T29TmRGYTc9e2GZh8fHE`
- **Evolution ZC:** `evolution-zc.emadigital.com.br` — stack ID 23, IP `5.161.246.197`, apikey `0e32e814b9136e33bbfcd634e2931f693057bddb`

## ⚠️ Regras críticas
- **NUNCA criar `middleware.ts`** — Next.js 16 usa `src/proxy.ts`
- **NUNCA mexer em `evolution.emadigital.com.br`** — servidor pessoal (32 instâncias)
- Migrações: `supabase/migrations/NNN_descricao.sql` — próxima = `013_`

## Estado Sprint 4 — ✅ TESTES CONCLUÍDOS (19/02/2026)

### O que funciona 100%
✅ Login/autenticação
✅ Dashboard com métricas reais
✅ Lista de clientes (2 ativos)
✅ **Seletor de grupos WhatsApp** — dropdown com busca, 168 grupos carregados em ~30s
✅ **Conectar grupo ao cliente** — 1 click, salva automaticamente
✅ **Análise manual** — "Rodar análise agora" gera Health Score em ~40s
✅ **Health Score gerado** — 50 (Risco Médio), 3 flags (no_payment_data, 2x no_form_response)
✅ **Webhook Evolution** — re-registrado com `zerochurn.brandosystem.com`
✅ **Serviços/Produtos** — carregados do localStorage (consistente com Configurações)

### Bugs encontrados e status
| Bug | Severidade | Status |
|-----|------------|--------|
| Nome do grupo não aparece ao reload (só ID mascarado) | 🟡 P2 | Não bloqueia — funciona ao conectar |
| `no_payment_data` mesmo com Asaas conectado | 🔴 P0 | Investigar orchestrator |
| "Renova em: NaN dias" | 🟡 P1 | Falta contract_end_date no cliente |

### Próximos passos (ordem de prioridade)
**P0 — Bloqueantes:**
1. ⚠️ **Fix orchestrator** — não está buscando dados do Asaas (flag `no_payment_data` incorreta)
2. ⚠️ **Verificar mensagens WhatsApp** — webhook registrado, mas não testamos se mensagens chegam

**P1 — Importantes:**
3. Salvar `group_name` no banco (campo `whatsapp_group_name` em `clients`)
4. Contract end date — fix cálculo "Renova em X dias"
5. Email templates persistence
6. Serviços/Produtos no banco (migração)

**P2 — Polish:**
7. Dashboard: gráfico churn histórico real
8. LGPD: exclusão de conta
9. Painel operacional: custo OpenAI

## WhatsApp — infra

### Endpoint correto v2.3.0
```
GET /group/fetchAllGroups/{instanceName}?getParticipants=false
```
⚠️ `/group/findGroupInfos` exige groupJid — NÃO use para listar todos

### Webhook
- **URL:** `https://zerochurn.brandosystem.com/api/whatsapp/webhook`
- **Status:** ✅ Registrado e ativo (atualizado em 19/02/2026)
- **Events:** `MESSAGES_UPSERT`, `CONNECTION_UPDATE`

### Fluxo
```
WhatsApp → Evolution webhook → POST /api/whatsapp/webhook
         → salva whatsapp_messages
         → análise lê do DB
```

## Crons (4 total)
```
"0 9 * * *"   → monthly-analysis      (Proximidade semanal + NPS mensal)
"0 8 * * *"   → form-reminders
"0 8 * * 1"   → check-integrations
"0 3 * * 0"   → purge-messages         (deleta >90 dias, domingo 03h)
```

## Variáveis de ambiente (Vercel)
```
NEXT_PUBLIC_APP_URL=https://zerochurn.brandosystem.com
EVOLUTION_API_URL=https://evolution-zc.emadigital.com.br
EVOLUTION_API_KEY=0e32e814b9136e33bbfcd634e2931f693057bddb
OPENAI_API_KEY=(internalized)
+ Supabase, Resend, CRON_SECRET
```

## Decisões arquiteturais
- Análise Proximidade = semanal; NPS/Resultado = mensal
- Peso semana recente via prompt (não fórmula)
- OpenAI internalized: sem BYOK
- WhatsApp QR Code only: agência escaneia
- Purge: mensagens >90 dias, lotes de 1.000
- `toErrorMsg(err)`: trata todos os tipos
- fetchAllGroups sem participants = rápido

## Último commit
`3bec7fa` — feat: seletor de grupo WhatsApp + correções críticas
