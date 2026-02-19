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
- **Login:** `arthur@emadigital.com.br` / `@Rthur1801`
- **Local:** `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn/`
- **Supabase:** projeto `hvpsxypzylqruuufbtxz`, PAT `sbp_44c3edcbe18b75e94fa90aedf7f229ba5b95649a`
- **Evolution ZC:** `evolution-zc.emadigital.com.br` — apikey `0e32e814b9136e33bbfcd634e2931f693057bddb`

## ⚠️ Regras críticas
- **NUNCA criar `middleware.ts`** — Next.js 16 usa `src/proxy.ts`
- Migrações: `supabase/migrations/NNN_descricao.sql` — próxima = `013_`

## Estado Sprint 4 — ✅ STRESS TEST COMPLETO (19/02/2026)

### O que funciona 100%
✅ Login/autenticação
✅ Dashboard com métricas reais (R$ 7.500 recorrente, 2 clientes)
✅ Lista de clientes com filtros
✅ **Seletor de grupos WhatsApp** — dropdown com busca, 168 grupos em ~30s, 1 click para conectar
✅ **Conectar grupo ao cliente** — conectou "[ACL.GPS] Elite Agência" com sucesso
✅ **Análise manual** — gerou Health Score 50 em ~40s
✅ **Webhook Evolution** — re-registrado para `zerochurn.brandosystem.com`
✅ **Campo "Produto vendido"** — corrigido (produtos agora persistem e aparecem no select)

### Bugs corrigidos (19/02)
| Bug | Commit | Status |
|-----|--------|--------|
| Produtos não aparecem ao cadastrar cliente | `74c2f68` | ✅ **RESOLVIDO** — agora lê produtos (não serviços) de `localStorage` |
| Webhook Evolution com URL antiga | `3bec7fa` | ✅ **RESOLVIDO** — re-registrado manualmente |
| Serviços em vez de produtos | `74c2f68` | ✅ **RESOLVIDO** — `zc_produtos_v1` com persistência |

### Bugs conhecidos (aguardando correção)
| Bug | Severidade | Próxima ação |
|-----|------------|--------------|
| `no_payment_data` mesmo com Asaas conectado | 🔴 P0 | Investigar orchestrator/data-fetcher |
| "Renova em: NaN dias" | 🟡 P1 | Adicionar `contract_end_date` no cadastro |
| Nome do grupo desaparece ao reload | 🟡 P2 | Migração 013: coluna `whatsapp_group_name` |

### Próximos passos
**P0 — Bloqueantes:**
1. **Fix orchestrator** — não está buscando dados do Asaas
2. **Verificar mensagens webhook** — testar se mensagens reais chegam no banco

**P1 — Importantes:**
3. Migração 013: `whatsapp_group_name` em `clients`
4. Contract end date no cadastro de cliente
5. Email templates persistence

## WhatsApp — infra

### Endpoint correto v2.3.0
```
GET /group/fetchAllGroups/{instanceName}?getParticipants=false
```

### Webhook
- **URL:** `https://zerochurn.brandosystem.com/api/whatsapp/webhook`
- **Status:** ✅ Ativo (atualizado 19/02/2026)
- **Events:** `MESSAGES_UPSERT`, `CONNECTION_UPDATE`

### Fluxo
```
WhatsApp → Evolution webhook → whatsapp_messages → análise lê do DB
```

## Produtos vs Serviços

### Serviços (localStorage: `zc_servicos_v1`)
- Componentes individuais (ex: "SEO On-page", "Gestão de Redes Sociais")
- Sem campo `type` (genéricos)
- Gerenciados em: Configurações → Serviços

### Produtos (localStorage: `zc_produtos_v1`)
- Pacotes que agrupam serviços (ex: "Tríade Gestão Comercial")
- Têm `entregaveis` e `bonus` (listas de ServiceItem)
- **Aparecem no campo "Método / Produto vendido"** ao cadastrar cliente
- Gerenciados em: Configurações → Produtos

## Crons (4 total)
```
"0 9 * * *"   → monthly-analysis
"0 8 * * *"   → form-reminders
"0 8 * * 1"   → check-integrations
"0 3 * * 0"   → purge-messages
```

## Variáveis de ambiente (Vercel)
```
NEXT_PUBLIC_APP_URL=https://zerochurn.brandosystem.com
EVOLUTION_API_URL=https://evolution-zc.emadigital.com.br
EVOLUTION_API_KEY=0e32e814b9136e33bbfcd634e2931f693057bddb
OPENAI_API_KEY=(internalized)
+ Supabase, Resend, CRON_SECRET
```

## Últimos commits
- `74c2f68` — fix: campo Produto vendido vazio (produtos agora persistem)
- `3bec7fa` — feat: seletor de grupo WhatsApp + webhook corrigido
- `4cf34d7` — docs: stress test completo
