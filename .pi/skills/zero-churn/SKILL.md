---
name: zero-churn
description: Contexto completo do projeto Zero Churn — SaaS de retenção de clientes para agências. Carrega arquitetura, decisões técnicas, estado dos sprints, estrutura de arquivos e padrões de código. Use quando trabalhar neste projeto.
---

# Zero Churn — Skill de Contexto

## Ação imediata

Ao carregar esta skill, leia o arquivo de contexto principal:

```
/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn/CLAUDE.md
```

Em seguida, verifique o estado atual do projeto:

```bash
cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
git log --oneline -5
git status
```

## Padrões do projeto

### Commits
```
feat: descrição curta

- detalhe 1
- detalhe 2
```
Push no `main` → deploy automático no Vercel.

### TypeScript
Sempre rodar antes de commitar:
```bash
cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
npx tsc --noEmit 2>&1 | grep -v "\.next/types"
```
Zero erros = pode commitar.

### SQL
Migrações vão em `supabase/migrations/` com numeração sequencial:
`001_`, `002_`, ..., `009_weekly_analysis.sql`
Próxima será `010_`.

### API Routes
- Rotas protegidas → verificam sessão via `createClient()` do `@/lib/supabase/server`
- Rotas de cron → verificam `Authorization: Bearer ${CRON_SECRET}`
- Rotas admin → usam `createAdminClient()` (service_role, bypassa RLS)

### Commits e deploy
```bash
git add -A
git commit -m "tipo: descrição"
git push origin main
# Deploy automático no Vercel em ~2 min
```

## Documentação de referência
- Plano completo: `docs/PLANEJAMENTO.md`
- Sprints: `docs/SPRINTS.md`
- Plano de construção: `docs/PLANO_DE_CONSTRUCAO.md`
