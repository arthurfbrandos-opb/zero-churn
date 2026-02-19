# Zero Churn — Contexto do Projeto para o Agente

## O que é
SaaS B2B para agências digitais. Monitora a saúde dos clientes via **Health Score** com IA (GPT-4o), prevenindo churn. Multitenancy: cada agência tem seus clientes, integrações e análises isoladas.

## Stack
- **Frontend/Backend:** Next.js 16.1.6 App Router (TypeScript)
- **Banco:** Supabase (Postgres + Auth + RLS + Storage)
- **Deploy:** Vercel (GitHub → push no `main` dispara deploy automático ~2 min)
- **E-mail:** Resend (`RESEND_API_KEY`)
- **IA:** OpenAI GPT-4o (`OPENAI_API_KEY`) — **internalized, sem BYOK**
- **Financeiro:** Asaas API + Dom Pagamentos API
- **WhatsApp:** Evolution API (servidor dedicado Zero Churn)

## Repositório e deploy
- **GitHub:** `https://github.com/arthurfbrandos-opb/zero-churn.git`
- **Branch principal:** `main`
- **Pasta do projeto:** `zero-churn/` (dentro do monorepo `Projeto_Zero_Churn/`)
- **Caminho local:** `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn/`
- **Supabase project:** `hvpsxypzylqruuufbtxz`
- **Supabase PAT:** `sbp_44c3edcbe18b75e94fa90aedf7f229ba5b95649a`

## ⚠️ Atenção — Next.js 16 usa `proxy.ts`, NUNCA `middleware.ts`
Este projeto usa Next.js **16.1.6**. O arquivo de middleware é `src/proxy.ts` (exporta função `proxy`).
**NUNCA criar `src/middleware.ts`** — se ambos existirem o build quebra.

## Estrutura de pastas importantes
```
zero-churn/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── clientes/[id]/        # Tabs: Visão Geral → Cadastro → Financeiro → Pasta → Integrações → Formulários → Histórico
│   │   │   ├── configuracoes/        # Tabs: Agência → Serviços → Produtos → Formulário NPS → Integrações → Usuários → Analisador → Templates de E-mail → Notificações → Privacidade
│   │   │   ├── operacional/
│   │   │   └── alertas/
│   │   ├── (public)/
│   │   │   ├── login/
│   │   │   ├── cadastro/
│   │   │   ├── recuperar-senha/
│   │   │   ├── redefinir-senha/
│   │   │   └── verificar-email/
│   │   ├── api/
│   │   │   ├── auth/signup/
│   │   │   ├── agency/               # PATCH: config; GET/POST/DELETE integrations
│   │   │   ├── agency/integrations/
│   │   │   ├── agency/integrations/test-resend/
│   │   │   ├── clients/[id]/         # GET/PATCH/DELETE cliente
│   │   │   ├── clients/[id]/contract/ # POST: upload contrato (bucket `contracts`)
│   │   │   ├── clients/[id]/action-items/
│   │   │   ├── analysis/[clientId]/  # POST: roda análise manual
│   │   │   ├── asaas/sync/[clientId]/
│   │   │   ├── dom/sync/[clientId]/
│   │   │   ├── whatsapp/
│   │   │   │   ├── webhook/          # POST: recebe mensagens Evolution (MESSAGES_UPSERT + CONNECTION_UPDATE)
│   │   │   │   ├── groups/           # GET: lista grupos da instância (busca por ?q=)
│   │   │   │   ├── instance/connect/ # POST: cria instância + retorna QR Code
│   │   │   │   ├── instance/status/  # GET: poll conexão (used every 3s)
│   │   │   │   ├── instance/disconnect/ # DELETE: logout + atualiza DB
│   │   │   │   ├── server-status/    # GET: health check do servidor Evolution
│   │   │   │   ├── connect/[clientId]/ # POST: vincula grupo ao cliente
│   │   │   │   └── validate-group/   # POST: valida grupo antes de vincular
│   │   │   ├── forms/[token]/        # GET: formulário NPS público
│   │   │   ├── forms/[token]/submit/ # POST: submete resposta NPS
│   │   │   ├── forms/send-reminders/ # POST: envia lembretes NPS
│   │   │   ├── forms/check-nonresponse/
│   │   │   ├── alerts/               # GET: alertas da agência
│   │   │   ├── operacional/          # GET: health score + dados
│   │   │   └── cron/
│   │   │       ├── monthly-analysis/ # Análise semanal (Proximidade) + mensal (NPS/Resultado)
│   │   │       ├── form-reminders/   # Lembretes NPS
│   │   │       ├── check-integrations/ # Verifica saúde das integrações
│   │   │       └── purge-messages/   # DELETE mensagens >90 dias (domingo 03h)
│   │   └── auth/callback/
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts   # Coordena agentes → Health Score final
│   │   │   ├── data-fetcher.ts   # Busca dados do Supabase
│   │   │   ├── proximidade.ts    # Agente WhatsApp — recebe { messages[] } pré-coletadas
│   │   │   ├── financeiro.ts     # Agente Financeiro
│   │   │   ├── nps.ts            # Agente NPS
│   │   │   ├── diagnostico.ts    # Agente Diagnóstico
│   │   │   └── types.ts          # Tipos compartilhados
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser (anon key)
│   │   │   ├── server.ts         # Server (cookies) + admin (service_role)
│   │   │   └── encryption.ts     # AES-256 para credenciais em DB
│   │   ├── evolution/
│   │   │   ├── client.ts         # Wrapper Evolution API completo
│   │   │   └── agency-config.ts  # instanceNameForAgency(), getAgencyEvolutionConfig()
│   │   ├── asaas/client.ts
│   │   ├── dom/client.ts
│   │   ├── email/
│   │   │   ├── resend.ts         # Templates de e-mail
│   │   │   └── agency-client.ts  # getAgencyEmailClient() — fallback para env vars
│   │   └── utils.ts              # toErrorMsg(), cn(), etc.
│   └── proxy.ts                  # Middleware de auth (Next.js 16)
├── supabase/migrations/          # 001–013 (próxima = 013)
├── vercel.json                   # 4 crons configurados
└── .env.local
```

## Banco de dados — tabelas principais
| Tabela | Descrição |
|--------|-----------|
| `agencies` | Agências. `analysis_day` (0-6, dia semana), `analysis_nps_day` (1-28, dia mês) |
| `agency_users` | User ↔ agência com `role` (admin/member) |
| `clients` | Clientes. `payment_status`, `health_score`, `churn_risk`, `contract_url`, `contract_filename`, `contract_uploaded_at` |
| `client_integrations` | Integrações por cliente (asaas, dom, evolution_api). `status`: connected/error |
| `agency_integrations` | Integrações por agência (asaas, dom_pagamentos, evolution_api, resend). Credenciais criptografadas em `encrypted_key` |
| `agency_email_templates` | Templates de e-mail customizados por agência |
| `whatsapp_messages` | Mensagens WhatsApp via webhook (índices: group_id, client_id, agency_id, timestamp_unix) |
| `health_score_history` | Snapshots do Health Score |
| `alerts` | Alertas gerados |
| `nps_forms` | Formulários NPS enviados |
| `nps_responses` | Respostas dos formulários |

## Migrações SQL
Pasta: `zero-churn/supabase/migrations/`
Nomenclatura: `NNN_descricao.sql` (sequencial)

| # | Arquivo | O que faz |
|---|---------|-----------|
| 001–008 | Setup inicial | Tabelas base, auth, clientes, integrações |
| 009 | `009_weekly_analysis.sql` | `whatsapp_messages`, `analysis_day` weekday CHECK |
| 010 | `010_add_resend_integration_type.sql` | Tipo `resend` em `agency_integrations` |
| 011 | `011_contract_and_email_templates.sql` | Campos contrato em `clients`, tabela `agency_email_templates` |
| 012 | `012_whatsapp_messages.sql` | Índices + RLS + service role policy em `whatsapp_messages` |

**Próxima migração: `013_`**

Como rodar: Supabase Dashboard → SQL Editor → cole o conteúdo.
Ou via Management API: `https://api.supabase.com/v1/projects/hvpsxypzylqruuufbtxz/database/query`

## WhatsApp — arquitetura completa

### Servidores Evolution API
| Servidor | URL | Para quem | API Key |
|---|---|---|---|
| Pessoal (NÃO MEXER) | `evolution.emadigital.com.br` | Agência pessoal do Arthur (32 instâncias) | `8k6XhXwAez43dM2N05ue` |
| **Zero Churn** | `evolution-zc.emadigital.com.br` | SaaS (agências clientes) | `0e32e814b9136e33bbfcd634e2931f693057bddb` |

Stack Portainer: `evolution_zerochurn` (ID: 23)
DB namespace: `evolution_zerochurn` (tabelas isoladas no mesmo PG)
Redis prefix: `evolution_zerochurn` (cache isolado, DB 6)
Portainer: `painel.emadigital.com.br` — admin / `T29TmRGYTc9e2GZh8fHE`
IP real do servidor: `5.161.246.197`

### Fluxo de mensagens (webhook-first)
```
WhatsApp → Evolution API → POST /api/whatsapp/webhook
         → salva em whatsapp_messages
         → análise semanal lê do DB (não da API)
```
Vantagem: análise roda mesmo se Evolution offline.

### Instance naming
`instanceNameForAgency(agencyId)` → `"agency-" + agencyId.replace(/-/g,'').slice(0,12)`

### O que o DB armazena por agência (em `agency_integrations`)
`{ instance_name, phone_number?, connected_at? }` → criptografado em `encrypted_key`
URL e API Key vêm **sempre** das env vars do sistema, nunca do DB.

### Webhook events handled
- `MESSAGES_UPSERT` → salva em `whatsapp_messages`, identifica agency por instance_name, vincula a client via group_id
- `CONNECTION_UPDATE` → salva phone/status da agência

### Limitação importante (comunicar ao usuário)
**Somente mensagens de grupos são coletadas.** Mensagens privadas (DM) são ignoradas.
O histórico de análise depende do engajamento nos grupos vinculados.
Esta limitação está exibida na UI com banner amarelo em Configurações → Integrações → WhatsApp.

### Webhook URL (registrado automaticamente)
`https://zero-churn-git-main-arthurfbrandos-opbs-projects.vercel.app/api/whatsapp/webhook`

## Health Score — arquitetura
- **Orquestrador:** `src/lib/agents/orchestrator.ts`
- **Janela histórica:** 60 dias; semana mais recente tem peso maior
- **Agentes:** Proximidade (WhatsApp semanal), Financeiro, NPS (mensal), Resultado (mensal)
- **Fallback:** se DB de mensagens vazio, tenta buscar da API ao vivo

## E-mails — templates
| Função | Quando | Disparado por |
|--------|--------|---------------|
| `sendEmailConfirmation` | Cadastro novo | `POST /api/auth/signup` |
| `sendFormReminder` | 5 dias antes do NPS | `POST /api/forms/send-reminders` |
| `sendAnalysisCompleted` | Análise concluída | cron |
| `sendPaymentAlert` | Inadimplência/vencimento | cron |
| `sendIntegrationAlert` | Asaas/Dom/WhatsApp offline | cron |

**Resend por agência:** cada agência configura sua própria chave + remetente em `agency_integrations` (type=`resend`).
Fallback: `RESEND_API_KEY` / `RESEND_FROM_EMAIL` das env vars.

## Crons (vercel.json) — 4 total
```
"0 9 * * *"   → /api/cron/monthly-analysis      (análise semanal Proximidade + mensal NPS)
"0 8 * * *"   → /api/cron/form-reminders         (lembretes NPS mensais)
"0 8 * * 1"   → /api/cron/check-integrations     (saúde das integrações)
"0 3 * * 0"   → /api/cron/purge-messages         (deleta whatsapp_messages >90 dias, domingo 03h)
```
Autenticação: header `x-cron-secret: ${CRON_SECRET}` ou `?secret=` query param.

## Storage
- **Bucket:** `contracts` — contratos dos clientes
- **API:** `POST /api/clients/[id]/contract` — FormData com campo `file`
- **RLS:** agência só acessa seus próprios arquivos

## Variáveis de ambiente necessárias
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_SECRET               # AES-256, 32 bytes hex
NEXT_PUBLIC_APP_URL             # https://zero-churn-git-main-arthurfbrandos-opbs-projects.vercel.app em prod
RESEND_API_KEY                  # Resend.com (fallback)
RESEND_FROM_EMAIL               # remetente fallback
CRON_SECRET                     # qualquer string segura
OPENAI_API_KEY                  # GPT-4o — sistema, nunca exposto à agência
EVOLUTION_API_URL               # https://evolution-zc.emadigital.com.br
EVOLUTION_API_KEY               # 0e32e814b9136e33bbfcd634e2931f693057bddb
```

## Modelos de negócio (decisões chave)
- **OpenAI Internalized (Option A Full):** custo embutido na assinatura. Sem BYOK. Estimativa R$6–32/mês por agência. `OPENAI_API_KEY` só em env vars do sistema.
- **Agências nunca configuram OpenAI** — tab "Analisador" em Configurações é apenas para ajuste de pesos, não para credenciais.
- **WhatsApp = QR Code only** — agência apenas escaneia QR. Zero Churn gerencia instâncias automaticamente via naming convention.

## Estado dos Sprints
- ✅ **Sprint 1:** setup, auth, agências, clientes, integrações básicas
- ✅ **Sprint 2:** crons, análise semanal, Dom Pagamentos, proxy.ts, e-mail, Resend por agência, tab Pasta (contratos), Configurações reestruturado
- ✅ **Sprint 3:** todos os agentes (financeiro, nps, proximidade, diagnostico, orchestrator), API de análise manual, tab Histórico, WhatsApp infra completa (webhook + QR Code flow + grupos), servidor Evolution dedicado Zero Churn, purge job
- 🔜 **Sprint 4:** dashboard Health Score histórico real, email templates persistence, serviços/produtos no banco, end-to-end com clientes reais

## Próximas tarefas (P1/P2)
- [ ] **Email templates persistence** — `GET/PATCH /api/agency/email-templates` + carregar no mount
- [ ] **Serviços/Produtos → banco** — migration + CRUD (atualmente localStorage)
- [ ] **Dashboard — gráfico churn histórico real** — `buildChurnHistory` com `health_scores` reais
- [ ] **End-to-end com clientes reais** — Sprint 4 DoD: rodar análise, tunar prompts/pesos

## Decisões arquiteturais
- `analysis_day` reusado para dia-da-semana (sem nova coluna)
- `analysis_nps_day` adicionado para dia-do-mês do NPS
- Análise de Proximidade = semanal (só agente WhatsApp); NPS/Resultado = mensal
- Peso da semana recente via prompt (não fórmula) — arquitetura simples
- Dom Pagamentos espelha padrão Asaas
- `toErrorMsg(err)` em `src/lib/utils.ts` — trata PostgrestError, Error, objetos, strings
- Purge: deleta mensagens >90 dias em lotes de 1.000 (60d análise + 30d margem)
