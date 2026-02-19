# Zero Churn — Contexto do Projeto para o Agente

## O que é
SaaS B2B para agências digitais. Monitora a saúde dos clientes via **Health Score** com IA (GPT-4o), prevenindo churn. Multitenancy: cada agência tem seus clientes, integrações e análises isoladas.

## Stack
- **Frontend/Backend:** Next.js 16.1.6 App Router (TypeScript)
- **Banco:** Supabase (Postgres + Auth + RLS + Storage)
- **Deploy:** Vercel → `zerochurn.brandosystem.com` (push `main` = auto deploy ~2 min)
- **E-mail:** Resend
- **IA:** OpenAI GPT-4o — **internalized, sem BYOK**
- **Financeiro:** Asaas API + Dom Pagamentos API
- **WhatsApp:** Evolution API (servidor dedicado Zero Churn)

## Repositório e acessos
- **GitHub:** `https://github.com/arthurfbrandos-opb/zero-churn.git`
- **Prod URL:** `https://zerochurn.brandosystem.com`
- **Caminho local:** `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn/`
- **Supabase project:** `hvpsxypzylqruuufbtxz`
- **Supabase PAT:** `sbp_44c3edcbe18b75e94fa90aedf7f229ba5b95649a`

## ⚠️ NUNCA criar `middleware.ts` — Next.js 16 usa `src/proxy.ts`

## Estrutura de pastas importantes
```
zero-churn/src/
├── app/
│   ├── (dashboard)/
│   │   ├── clientes/[id]/page.tsx     # Tabs: Visão Geral → Cadastro → Financeiro → Pasta → Integrações → Formulários → Histórico
│   │   └── configuracoes/page.tsx     # Tabs: Agência → Serviços → Produtos → NPS → Integrações → Usuários → Analisador → Templates → Notificações → Privacidade
│   └── api/
│       ├── whatsapp/
│       │   ├── webhook/               # POST: recebe eventos Evolution (MESSAGES_UPSERT, CONNECTION_UPDATE)
│       │   ├── groups/                # GET: lista grupos via fetchAllGroups (maxDuration=60)
│       │   ├── instance/connect/      # POST: cria instância + QR Code
│       │   ├── instance/status/       # GET: poll conexão (3s)
│       │   ├── instance/disconnect/   # DELETE: logout
│       │   ├── server-status/         # GET: health check servidor Evolution
│       │   ├── connect/[clientId]/    # POST: vincula grupo ao cliente / DELETE: desvincula
│       │   └── validate-group/        # POST: valida grupo
│       └── cron/
│           ├── monthly-analysis/      # Análise semanal Proximidade + mensal NPS/Resultado
│           ├── form-reminders/        # Lembretes NPS
│           ├── check-integrations/    # Saúde das integrações
│           └── purge-messages/        # DELETE mensagens >90 dias (domingo 03h)
├── lib/
│   ├── agents/
│   │   ├── orchestrator.ts            # Coordena agentes → Health Score
│   │   ├── proximidade.ts             # Agente WhatsApp — recebe { messages[] } pré-coletadas
│   │   ├── financeiro.ts / nps.ts / diagnostico.ts
│   │   └── data-fetcher.ts / types.ts
│   ├── evolution/
│   │   ├── client.ts                  # listGroups() usa /group/fetchAllGroups (timeout 45s)
│   │   └── agency-config.ts           # instanceNameForAgency() → "agency-{12chars}"
│   └── utils.ts                       # toErrorMsg()
└── proxy.ts                           # Middleware auth (Next.js 16)
```

## Banco de dados — migrações
| # | Arquivo | O que faz |
|---|---------|-----------|
| 001–008 | Setup inicial | Base, auth, clientes, integrações |
| 009 | `009_weekly_analysis.sql` | whatsapp_messages, analysis_day CHECK |
| 010 | `010_add_resend_integration_type.sql` | Tipo resend |
| 011 | `011_contract_and_email_templates.sql` | Contrato nos clientes, email templates |
| 012 | `012_whatsapp_messages.sql` | Índices + RLS + service role |

**Próxima migração: `013_`**

## WhatsApp — arquitetura

### Servidores Evolution API
| Servidor | URL | Para quem | API Key |
|---|---|---|---|
| Pessoal (**NÃO MEXER**) | `evolution.emadigital.com.br` | Agência Arthur (32 instâncias) | `8k6XhXwAez43dM2N05ue` |
| **Zero Churn** | `evolution-zc.emadigital.com.br` | SaaS agências | `0e32e814b9136e33bbfcd634e2931f693057bddb` |

- Stack Portainer: `evolution_zerochurn` (ID: 23) — IP real: `5.161.246.197`
- Portainer: `painel.emadigital.com.br` — admin / `T29TmRGYTc9e2GZh8fHE`

### Endpoint correto para listar grupos (v2.3.0)
```
GET /group/fetchAllGroups/{instanceName}?getParticipants=false
```
⚠️ `/group/findGroupInfos` exige groupJid específico — NÃO use para listar todos.
⚠️ Timeout de 45s necessário (168+ grupos = ~25s de resposta).

### Fluxo de mensagens (webhook-first)
```
WhatsApp → Evolution API webhook → POST /api/whatsapp/webhook
         → salva em whatsapp_messages
         → análise semanal lê do DB (não da API ao vivo)
```

### Instance naming
`instanceNameForAgency(agencyId)` → `"agency-" + agencyId.replace(/-/g,'').slice(0,12)`

### O que o DB armazena por agência (agency_integrations)
`{ instance_name, phone_number?, connected_at? }` → criptografado em `encrypted_key`
URL e API Key vêm **sempre** das env vars, nunca do DB.

### Limitação — somente grupos
**Mensagens privadas (DM) são ignoradas.** Só grupos vinculados são coletados.
Banner amarelo exibido na UI em Configurações → Integrações → WhatsApp.

### Webhook URL (registrado automaticamente ao conectar)
`https://zerochurn.brandosystem.com/api/whatsapp/webhook`

## Crons — 4 total (vercel.json)
```
"0 9 * * *"   → /api/cron/monthly-analysis      (análise Proximidade semanal + NPS mensal)
"0 8 * * *"   → /api/cron/form-reminders         (lembretes NPS)
"0 8 * * 1"   → /api/cron/check-integrations     (saúde integrações)
"0 3 * * 0"   → /api/cron/purge-messages         (deleta whatsapp_messages >90 dias)
```
Auth: `x-cron-secret: ${CRON_SECRET}` ou `?secret=`

## Variáveis de ambiente (Vercel prod)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_SECRET               # AES-256, 32 bytes hex
NEXT_PUBLIC_APP_URL             # https://zerochurn.brandosystem.com
RESEND_API_KEY
RESEND_FROM_EMAIL
CRON_SECRET
OPENAI_API_KEY                  # Internalized — nunca exposto
EVOLUTION_API_URL               # https://evolution-zc.emadigital.com.br
EVOLUTION_API_KEY               # 0e32e814b9136e33bbfcd634e2931f693057bddb
```

## Estado atual dos Sprints

### ✅ Concluído (Sprint 0–3 completos)
- Auth completo (cadastro, login, recuperação, confirmação email)
- CRUD de clientes completo (7 tabs)
- Integrações: Asaas, Dom Pagamentos, Resend (por agência), WhatsApp (QR Code)
- Todos os agentes IA: financeiro, nps, proximidade, diagnostico, orchestrator
- API de análise manual (`/api/analysis/[clientId]`) + botão "Analisar agora"
- Crons: análise semanal, lembretes NPS, check-integrações, purge mensagens
- Tab Pasta: upload/download/delete de contratos (Storage bucket `contracts`)
- Tab Histórico: evolução do health score
- Configurações: Serviços, Produtos, Templates de E-mail, Integrações
- Servidor Evolution dedicado Zero Churn (`evolution-zc.emadigital.com.br`)
- Domínio próprio: `zerochurn.brandosystem.com` (Cloudflare + Vercel)
- Supabase URLs atualizadas para novo domínio

### 🔜 Próximos passos (Sprint 4)

**P0 — Testar análise com cliente real:**
- [ ] **Seletor de grupo na aba Integrações do cliente** — substituir input manual de group_id por dropdown que busca grupos do número conectado (próximo a fazer)
- [ ] Conectar primeiro grupo real a um cliente
- [ ] Rodar análise e validar Health Score + diagnóstico

**P1 — Polish:**
- [ ] Email templates persistence (`GET/PATCH /api/agency/email-templates`)
- [ ] Serviços/Produtos no banco (atualmente localStorage)
- [ ] Dashboard: gráfico churn histórico real

**P2 — Operacional:**
- [ ] LGPD: exclusão de conta e dados
- [ ] Painel operacional: custo OpenAI real (tokens do log)
- [ ] Onboarding para novos usuários

## Decisões arquiteturais
- `analysis_day` = dia da semana (0-6) — reutilizado, sem nova coluna
- Análise Proximidade = semanal; NPS/Resultado = mensal
- Peso semana recente via prompt (não fórmula)
- OpenAI Internalized: custo embutido na assinatura, sem BYOK
- WhatsApp QR Code only: agência escaneia, Zero Churn gerencia instâncias
- Purge automático: mensagens >90 dias deletadas em lotes de 1.000
- `toErrorMsg(err)` em `src/lib/utils.ts`: trata todos os tipos de erro
