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

## Acessos e repositório
- **GitHub:** `https://github.com/arthurfbrandos-opb/zero-churn.git`
- **Prod URL:** `https://zerochurn.brandosystem.com`
- **Caminho local:** `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn/`
- **Supabase project:** `hvpsxypzylqruuufbtxz`
- **Supabase PAT:** `sbp_44c3edcbe18b75e94fa90aedf7f229ba5b95649a`
- **Portainer:** `painel.emadigital.com.br` — admin / `T29TmRGYTc9e2GZh8fHE`

## ⚠️ Regras críticas
- **NUNCA criar `middleware.ts`** — Next.js 16 usa `src/proxy.ts` (exporta função `proxy`)
- **NUNCA mexer em `evolution.emadigital.com.br`** — servidor pessoal do Arthur (32 instâncias)
- Migrações sempre em `supabase/migrations/NNN_descricao.sql` — próxima = `013_`
- Push em `main` = deploy automático Vercel (~2 min)

---

## Estrutura de arquivos críticos

```
zero-churn/src/
├── proxy.ts                           # Auth middleware (Next.js 16)
├── app/
│   ├── (dashboard)/
│   │   ├── clientes/[id]/page.tsx     # Tabs: Visão Geral → Cadastro → Financeiro → Pasta → Integrações → Formulários → Histórico
│   │   └── configuracoes/page.tsx     # Tabs: Agência → Serviços → Produtos → NPS → Integrações → Usuários → Analisador → Templates → Notificações → Privacidade
│   └── api/
│       ├── analysis/[clientId]/       # POST: análise manual (orquestrador)
│       ├── whatsapp/
│       │   ├── webhook/               # POST: MESSAGES_UPSERT + CONNECTION_UPDATE
│       │   ├── groups/                # GET: fetchAllGroups (maxDuration=60, timeout 45s)
│       │   ├── instance/connect/      # POST: cria instância + QR Code
│       │   ├── instance/status/       # GET: poll conexão (3s)
│       │   ├── instance/disconnect/   # DELETE: logout
│       │   ├── server-status/         # GET: health check Evolution
│       │   ├── connect/[clientId]/    # POST: vincula grupo / DELETE: desvincula
│       │   └── validate-group/        # POST: valida grupo
│       ├── clients/[id]/contract/     # POST: upload contrato (bucket contracts)
│       ├── clients/[id]/action-items/ # GET/POST/PATCH: itens do plano de ação
│       └── cron/
│           ├── monthly-analysis/      # Análise Proximidade semanal + NPS mensal
│           ├── form-reminders/        # Lembretes NPS
│           ├── check-integrations/    # Saúde das integrações
│           └── purge-messages/        # DELETE mensagens >90 dias (domingo 03h)
├── lib/
│   ├── agents/
│   │   ├── orchestrator.ts            # Coordena agentes → Health Score final
│   │   ├── proximidade.ts             # WhatsApp — recebe { messages[] } pré-coletadas
│   │   ├── financeiro.ts / nps.ts / diagnostico.ts / data-fetcher.ts / types.ts
│   ├── evolution/
│   │   ├── client.ts                  # listGroups() via /group/fetchAllGroups (timeout 45s)
│   │   └── agency-config.ts           # instanceNameForAgency() → "agency-{12chars}"
│   ├── email/resend.ts + agency-client.ts
│   ├── asaas/client.ts + dom/client.ts
│   ├── supabase/client.ts + server.ts + encryption.ts
│   └── utils.ts                       # toErrorMsg()
```

---

## Banco de dados

### Migrações aplicadas
| # | Arquivo | O que faz |
|---|---------|-----------|
| 001–008 | Setup inicial | Base, auth, clientes, integrações, pagamentos |
| 009 | `009_weekly_analysis.sql` | whatsapp_messages, analysis_day CHECK weekday |
| 010 | `010_add_resend_integration_type.sql` | Tipo resend em agency_integrations |
| 011 | `011_contract_and_email_templates.sql` | Contrato nos clientes, agency_email_templates |
| 012 | `012_whatsapp_messages.sql` | Índices + RLS + service role policy |

**Próxima: `013_`**

### Tabelas principais
| Tabela | Campos chave |
|--------|-------------|
| `agencies` | `analysis_day` (0-6 dia semana), `analysis_nps_day` (1-28 dia mês) |
| `clients` | `health_score`, `churn_risk`, `payment_status`, `whatsapp_group_id`, `contract_url` |
| `agency_integrations` | `type` (asaas/dom_pagamentos/evolution_api/resend), `encrypted_key`, `status` |
| `client_integrations` | Integrações por cliente (asaas, dom, evolution_api) |
| `whatsapp_messages` | `agency_id`, `client_id`, `group_id`, `sender_jid`, `text`, `timestamp_unix` |
| `health_score_history` | Snapshots do Health Score por cliente |
| `nps_forms` / `nps_responses` | Formulários e respostas NPS |
| `agency_email_templates` | Templates de e-mail customizados por agência |

---

## WhatsApp — infra completa

### Servidores Evolution API
| Servidor | URL | Para quem | API Key |
|---|---|---|---|
| Pessoal (**NÃO MEXER**) | `evolution.emadigital.com.br` | Agência Arthur (32 instâncias) | `8k6XhXwAez43dM2N05ue` |
| **Zero Churn** | `evolution-zc.emadigital.com.br` | SaaS agências | `0e32e814b9136e33bbfcd634e2931f693057bddb` |

Stack Portainer: `evolution_zerochurn` (ID: 23) — IP: `5.161.246.197`

### Endpoints corretos v2.3.0
```
# Listar TODOS os grupos (funciona):
GET /group/fetchAllGroups/{instanceName}?getParticipants=false
→ Timeout 45s necessário (168+ grupos = ~25s)

# Buscar grupo específico (funciona):
GET /group/findGroupInfos/{instanceName}?groupJid=120363xxx@g.us

# ❌ NÃO usar findGroupInfos sem groupJid — retorna 400
```

### Fluxo webhook-first
```
WhatsApp → Evolution → POST /api/whatsapp/webhook
        → salva em whatsapp_messages
        → análise semanal lê do DB (robusto: funciona mesmo Evolution offline)
```

### Instance naming
`instanceNameForAgency(agencyId)` → `"agency-" + agencyId.replace(/-/g,'').slice(0,12)`

### DB por agência (agency_integrations.encrypted_key)
`{ instance_name, phone_number?, connected_at? }` — URL/Key sempre das env vars

### Limitação documentada na UI
Somente grupos são monitorados. Banner amarelo em Configurações → Integrações → WhatsApp.

---

## Crons (vercel.json)
```
"0 9 * * *"   → /api/cron/monthly-analysis      (Proximidade semanal + NPS mensal)
"0 8 * * *"   → /api/cron/form-reminders
"0 8 * * 1"   → /api/cron/check-integrations
"0 3 * * 0"   → /api/cron/purge-messages         (domingo 03h, deleta >90 dias)
```
Auth: header `x-cron-secret: ${CRON_SECRET}` ou `?secret=`

---

## Variáveis de ambiente (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_SECRET               # AES-256, 32 bytes hex
NEXT_PUBLIC_APP_URL             # https://zerochurn.brandosystem.com
RESEND_API_KEY / RESEND_FROM_EMAIL
CRON_SECRET
OPENAI_API_KEY                  # internalized — nunca exposto
EVOLUTION_API_URL               # https://evolution-zc.emadigital.com.br
EVOLUTION_API_KEY               # 0e32e814b9136e33bbfcd634e2931f693057bddb
```

---

## Estado dos Sprints

### ✅ Sprint 0–3 completos
- Auth completo (cadastro, login, recuperação, confirmação email, PKCE)
- CRUD clientes: 7 tabs (Visão Geral, Cadastro, Financeiro, Pasta, Integrações, Formulários, Histórico)
- Integrações: Asaas, Dom, Resend por agência, WhatsApp QR Code
- Todos os agentes IA: financeiro, nps, proximidade, diagnostico, orchestrator
- API análise manual + botão "Analisar agora" + loading state
- Tab Pasta: upload/download/delete contratos (Storage bucket `contracts`)
- Tab Histórico: evolução do health score
- Configurações: Serviços, Produtos, Templates E-mail, Integrações completas
- Servidor Evolution dedicado Zero Churn
- Domínio: `zerochurn.brandosystem.com` (Cloudflare CNAME → Vercel)
- Supabase URLs atualizadas
- Purge cron: mensagens >90 dias, lotes de 1.000

### 🔄 Sprint 4 — Em progresso
**Último commit:** `426b6c1` — chore: salva estado Sprint 3 + inicio Sprint 4

**P0 — Bloqueante:**
- [ ] **Seletor de grupo na aba Integrações do cliente** — trocar input manual por dropdown com busca (código em andamento na sessão atual)
- [ ] Stress test + auditoria completa do sistema
- [ ] Conectar primeiro grupo real → análise → validar Health Score

**P1 — Polish:**
- [ ] Email templates persistence (GET/PATCH /api/agency/email-templates)
- [ ] Serviços/Produtos no banco (hoje em localStorage)
- [ ] Dashboard: gráfico churn histórico real
- [ ] Webhook re-registro após mudança de domínio

**P2 — Operacional:**
- [ ] LGPD: exclusão de conta e dados
- [ ] Painel operacional: custo OpenAI real
- [ ] Onboarding fluxo 3 steps

---

## Decisões arquiteturais
- `analysis_day` = dia da semana (0-6), reutilizado sem nova coluna
- Análise Proximidade = semanal; NPS/Resultado = mensal
- Peso semana recente via prompt (não fórmula)
- OpenAI internalized: custo embutido na assinatura, sem BYOK
- WhatsApp QR Code only: agência escaneia, Zero Churn gerencia instâncias
- Purge: mensagens >90 dias deletadas em lotes de 1.000 (60d análise + 30d margem)
- `toErrorMsg(err)`: trata PostgrestError, Error, objetos e strings uniformemente
- fetchAllGroups sem participants = rápido; com participants = muito lento (168 grupos)

---

## Padrões de código

### Commits
```bash
git add -A && git commit -m "tipo: descricao curta" && git push origin main
```

### API Routes
- Rotas protegidas: `createClient()` do `@/lib/supabase/server`
- Rotas cron: header `x-cron-secret` ou query `?secret`
- Rotas admin: `createAdminClient()` (service_role, bypassa RLS)
- Rotas lentas: exportar `export const maxDuration = 60`

### Erros
Sempre usar `toErrorMsg(err)` de `@/lib/utils` — nunca `(err as Error).message` diretamente.
