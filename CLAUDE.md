# Zero Churn — Contexto do Projeto para o Agente

## O que é
SaaS B2B para agências digitais. Monitora a saúde dos clientes via **Health Score** com IA (GPT-4o), prevenindo churn. Multitenancy: cada agência tem seus clientes, integrações e análises isoladas.

## Stack
- **Frontend/Backend:** Next.js 14 App Router (TypeScript)
- **Banco:** Supabase (Postgres + Auth + RLS + Storage)
- **Deploy:** Vercel (GitHub → push no `main` dispara deploy automático)
- **E-mail:** Resend (`RESEND_API_KEY`)
- **IA:** OpenAI GPT-4o (`OPENAI_API_KEY`)
- **Financeiro:** Asaas API + Dom Pagamentos API
- **WhatsApp:** Evolution API

## Repositório e deploy
- **GitHub:** `https://github.com/arthurfbrandos-opb/zero-churn.git`
- **Branch principal:** `main`
- **Pasta do projeto:** `zero-churn/` (dentro do monorepo `Projeto_Zero_Churn/`)
- **Caminho local:** `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn/`
- Deploy: push no `main` → Vercel build automático (~2 min)

## Estrutura de pastas importantes
```
zero-churn/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Rotas protegidas (requer auth)
│   │   │   ├── dashboard/
│   │   │   ├── clientes/
│   │   │   ├── configuracoes/
│   │   │   └── alertas/
│   │   ├── (public)/             # Rotas públicas
│   │   │   ├── login/
│   │   │   ├── cadastro/
│   │   │   ├── recuperar-senha/
│   │   │   ├── redefinir-senha/
│   │   │   └── verificar-email/
│   │   ├── api/
│   │   │   ├── auth/signup/      # Cadastro: cria user + agência
│   │   │   ├── agency/           # PATCH: atualiza configurações da agência
│   │   │   ├── agency/integrations/ # GET/POST/DELETE: Asaas/Dom credenciais
│   │   │   ├── asaas/sync/[clientId]/ # GET/POST/PATCH/DELETE sync Asaas
│   │   │   ├── dom/sync/[clientId]/   # GET/POST/PATCH/DELETE sync Dom
│   │   │   ├── whatsapp/         # connect, validate-group
│   │   │   ├── forms/            # [token], [token]/submit, send-reminders, check-nonresponse
│   │   │   ├── alerts/           # GET alertas da agência
│   │   │   ├── operacional/      # GET health score + dados do cliente
│   │   │   └── cron/
│   │   │       ├── monthly-analysis/  # Análise semanal de todos os clientes
│   │   │       ├── form-reminders/    # Lembretes NPS mensais
│   │   │       └── check-integrations/ # Verifica saúde das integrações
│   │   └── auth/callback/        # Handler PKCE do Supabase
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts   # Coordena todos os agentes → Health Score final
│   │   │   ├── data-fetcher.ts   # Busca dados do Supabase para os agentes
│   │   │   ├── proximidade.ts    # Agente WhatsApp (análise semanal)
│   │   │   ├── financeiro.ts     # Agente Financeiro (Asaas/Dom)
│   │   │   ├── nps.ts            # Agente NPS (formulários mensais)
│   │   │   ├── resultado.ts      # Agente Resultado (contratos/metas)
│   │   │   └── types.ts          # Tipos compartilhados dos agentes
│   │   ├── supabase/
│   │   │   ├── client.ts         # Cliente browser (anon key)
│   │   │   └── server.ts         # Cliente server (cookies) + admin (service_role)
│   │   ├── asaas/client.ts       # Wrapper Asaas API
│   │   ├── dom/client.ts         # Wrapper Dom Pagamentos API
│   │   ├── evolution/client.ts   # Wrapper Evolution API (WhatsApp)
│   │   └── email/resend.ts       # Templates e envio de e-mail
│   └── middleware.ts             # Proteção de rotas server-side (Supabase SSR)
├── supabase/
│   └── migrations/               # 001 a 009 — rodar no Supabase SQL Editor
├── vercel.json                   # Crons configurados
└── .env.local                    # Variáveis de ambiente (não commitado)
```

## Banco de dados — tabelas principais
| Tabela | Descrição |
|--------|-----------|
| `agencies` | Agências cadastradas. Campos-chave: `analysis_day` (0-6, dia da semana), `analysis_nps_day` (1-28, dia do mês) |
| `agency_users` | Vinculo user ↔ agência com `role` (admin/member) |
| `clients` | Clientes de cada agência. Campos: `payment_status`, `health_score`, `churn_risk` |
| `client_integrations` | Integrações por cliente (asaas, dom, whatsapp). Campo `status`: connected/error |
| `whatsapp_messages` | Mensagens do WhatsApp (60 dias de histórico) |
| `health_score_history` | Snapshots do Health Score por cliente |
| `alerts` | Alertas gerados (integration_error, stale_whatsapp, etc.) |
| `nps_forms` | Formulários NPS enviados |
| `nps_responses` | Respostas dos formulários |

## Campos importantes de `agencies`
- `analysis_day` — **dia da semana** (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab) para análise semanal do agente Proximidade
- `analysis_nps_day` — **dia do mês** (1-28) para envio de lembretes NPS mensais; default = 5
- CHECK constraint: `agencies_analysis_day_weekday CHECK (analysis_day BETWEEN 0 AND 6)`

## Health Score — arquitetura
- **Orquestrador:** `src/lib/agents/orchestrator.ts`
- **Janela histórica:** 60 dias; semana mais recente tem peso maior
- **Agentes:** Proximidade (WhatsApp), Financeiro (Asaas/Dom), NPS, Resultado
- **Cadência:** Proximidade = semanal; NPS/Resultado = mensal
- **Prompt Proximidade:** última semana marcada com `[SEMANA MAIS RECENTE — peso maior na avaliação]`

## Crons (vercel.json)
```json
"0 9 * * *"   → /api/cron/monthly-analysis    (análise semanal de proximidade)
"0 8 * * *"   → /api/cron/form-reminders      (lembretes NPS mensais)
"0 8 * * 1"   → /api/cron/check-integrations  (verifica saúde das integrações)
```
Todos exigem header: `Authorization: Bearer ${CRON_SECRET}`

## ⚠️ Atenção — Next.js 16 usa `proxy.ts`, não `middleware.ts`
Este projeto usa Next.js **16.1.6**. O arquivo de middleware é `src/proxy.ts` (exporta função `proxy`), **não** `src/middleware.ts`. Se ambos existirem o build quebra com erro:
> "Both middleware file and proxy file are detected. Please use proxy.ts only."

Nunca criar `middleware.ts` neste projeto.

## Auth — fluxo completo
1. **Cadastro** (`/cadastro` → `POST /api/auth/signup`):
   - Cria user via admin API → cria agência → vincula user à agência
   - Gera link de confirmação via `admin.generateLink` + envia e-mail via Resend
   - Falha no e-mail não bloqueia cadastro
2. **Confirmação** → `/auth/callback` → trata `code` (PKCE) ou `token_hash`
3. **Login** → `supabase.auth.signInWithPassword` direto no cliente
4. **Recuperar senha** → `resetPasswordForEmail` com `redirectTo=/auth/callback?type=recovery`
5. **Redefinir senha** → `/redefinir-senha` → `supabase.auth.updateUser({ password })`
6. **Middleware** (`src/middleware.ts`) → protege todas as rotas server-side

## Variáveis de ambiente necessárias
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_SECRET          # AES-256, 32 bytes hex
NEXT_PUBLIC_APP_URL        # https://... em prod, http://localhost:3000 em dev
RESEND_API_KEY             # Resend.com
CRON_SECRET                # Qualquer string segura
ASAAS_API_KEY
ASAAS_API_URL              # https://api.asaas.com/v3
OPENAI_API_KEY
EVOLUTION_API_URL          # Evolution API (WhatsApp)
EVOLUTION_API_KEY
EVOLUTION_INSTANCE
```

## Migrações SQL
Pasta: `zero-churn/supabase/migrations/`
Arquivos: `001` a `009_weekly_analysis.sql` + `all_pending.sql`
Como rodar: Supabase Dashboard → SQL Editor → cole o conteúdo do arquivo

## Estado dos Sprints
- **Sprint 1** ✅ Completo: setup, auth, agências, clientes, integrações básicas
- **Sprint 2** ✅ Completo: crons, análise semanal, Dom Pagamentos completo, middleware, e-mail de confirmação
- **Sprint 3** 🔜 Próximo: dashboard de Health Score, alertas UI, relatórios

## Decisões arquiteturais chave
- `analysis_day` reusado para dia-da-semana (não adicionou nova coluna)
- Análise de proximidade usa apenas o agente de WhatsApp (semanal)
- NPS/Resultado permanece mensal
- Peso da semana mais recente via prompt (não via fórmula) — mantém arquitetura simples
- Admin API para signup (cria agência junto) + Resend para e-mail customizado
- Dom Pagamentos espelha exatamente o padrão Asaas (POST cria integração + calcula payment_status, PATCH re-sync)
