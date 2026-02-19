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
- Migrações: `supabase/migrations/NNN_descricao.sql` — próxima = `014_`
- **Queries SQL de debug/investigação:** Sempre salvar em `supabase/migrations/DEBUG_NNN_descricao.sql` (não executar automaticamente, apenas documentação/organização)

## Estado Sprint 4 — ✅ (19/02/2026)

### O que funciona 100%
✅ **Tab "Contrato"** (renomeado de "Pasta") — foco exclusivo em contrato, futura integração Autentique
✅ **Nome do grupo WhatsApp persiste** — salvo em `whatsapp_group_name`, exibido em destaque nas integrações
✅ **Destaque visual do grupo monitorado** — layout melhorado, nome em verde, sublabel informativo
✅ Login/autenticação
✅ Dashboard com métricas reais
✅ Lista de clientes com filtros
✅ Seletor de grupos WhatsApp — dropdown com busca, 1 click para conectar
✅ Análise manual — Health Score gerado em ~40s
✅ Webhook Evolution — `zerochurn.brandosystem.com/api/whatsapp/webhook`
✅ Campo "Produto vendido" — produtos persistem em localStorage

### Últimas mudanças (19/02/2026)
| Commit | Descrição |
|--------|-----------|
| `763cf38` | **Migration 013**: coluna `whatsapp_group_name` — persiste nome do grupo WhatsApp |
| `51a62cd` | feat: destaca nome do grupo WhatsApp nas integrações (layout melhorado) |
| `e3a1f76` | refactor: renomeia "Pasta" → "Contrato" + menção Autentique |
| `74c2f68` | fix: produtos agora persistem em localStorage e aparecem no select |
| `0b3eaec` | debug: logs no data-fetcher para investigar `no_payment_data` |

### Bugs conhecidos (aguardando correção)
| Bug | Severidade | Próxima ação |
|-----|------------|--------------|
| `no_payment_data` mesmo com Asaas conectado | 🔴 P0 | Investigar orchestrator/data-fetcher (logs adicionados) |
| "Renova em: NaN dias" | 🟡 P1 | Adicionar `contract_end_date` no cadastro |

### Teste para reconectar grupo (manual)
Para salvar o nome do grupo em clientes existentes:
1. Ir em Cliente → Integrações → WhatsApp
2. Clicar em "Desconectar" (confirma no dialog)
3. Clicar em "Carregar grupos do WhatsApp"
4. Buscar e clicar no grupo "[ACL.GPS] Elite Agência"
5. **Agora o nome ficará salvo permanentemente**

## Migrações aplicadas
- `001`–`012`: base system + analytics
- **`013_whatsapp_group_name.sql`** ✅ **APLICADA** — adiciona coluna `whatsapp_group_name TEXT NULL` em `clients`

## Integrações WhatsApp

### Nome do grupo
- **Coluna:** `clients.whatsapp_group_name`
- **Salvo em:** `POST /api/whatsapp/connect/[clientId]` (valida via Evolution e salva nome)
- **Exibido em:** Tab Integrações do cliente — card verde com destaque
- **Persiste:** Mesmo após reload da página

### Endpoint Evolution
```
GET /group/fetchAllGroups/{instanceName}?getParticipants=false
```

### Webhook
- **URL:** `https://zerochurn.brandosystem.com/api/whatsapp/webhook`
- **Status:** ✅ Ativo
- **Events:** `MESSAGES_UPSERT`, `CONNECTION_UPDATE`

## Contrato (ex-Pasta)

### Mudanças
- **Tab renomeada:** "Pasta" → "Contrato"
- **Ícone:** `FolderOpen` → `FileText`
- **Foco:** Exclusivamente contrato (não outros documentos)
- **Futuro:** Integração com [Autentique](https://painel.autentique.com.br/) para envio de contratos

### Funcionalidades atuais
- Upload de contrato (PDF/DOC/DOCX, máx. 10MB)
- Download de contrato
- Substituir contrato
- Excluir contrato

## Produtos vs Serviços

### Serviços (localStorage: `zc_servicos_v1`)
- Componentes individuais (ex: "SEO On-page", "Gestão de Redes Sociais")
- Gerenciados em: Configurações → Serviços

### Produtos (localStorage: `zc_produtos_v1`)
- Pacotes que agrupam serviços (ex: "Tríade Gestão Comercial")
- **Aparecem no campo "Método / Produto vendido"** ao cadastrar cliente
- Persistem em localStorage
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
ENCRYPTION_SECRET=76978de91a26509ba098eab5f281a050524ed7d64f8cdaa5cc1c2a6661de21b8
+ Supabase, Resend, CRON_SECRET
```

## Últimos commits (reverse chronological)
- `763cf38` — feat: whatsapp_group_name column + persistence (migration 013)
- `51a62cd` — feat: destaca nome do grupo WhatsApp nas integrações
- `e3a1f76` — refactor: "Pasta" → "Contrato" + Autentique mention
- `74c2f68` — fix: produtos vazio resolvido (localStorage persistence)
- `0b3eaec` — debug: logs data-fetcher (investigate no_payment_data)
- `acf245e` — docs: CLAUDE.md updated
- `4cf34d7` — docs: stress test complete
- `3bec7fa` — feat: WhatsApp group selector + critical fixes
