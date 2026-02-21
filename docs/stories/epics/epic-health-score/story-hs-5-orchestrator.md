# Story HS-5: Orquestrador de Analise

**Epic:** Health Score — Motor de IA Preditiva (EPIC-HS)
**Story ID:** HS-5
**Priority:** Critical
**Points:** 13
**Effort:** 4-5 dias
**Status:** ✅ Done
**Type:** Feature
**Lead:** @dev (Dex) + @architect (Aria)
**Repository:** zero-churn
**Sprint:** 3 (Task S3-14)

---

## User Story

**Como** sistema Zero Churn,
**Quero** executar todos os agentes de analise em sequencia coordenada para cada cliente,
**Para** gerar um Health Score completo com diagnostico, plano de acao e alertas automaticos, tanto sob demanda quanto por cron semanal.

---

## Objective

Implementar orquestrador que coordena todo o pipeline de analise:
1. Coleta dados de todas as fontes
2. Executa agentes (financeiro + NPS em paralelo, proximidade sequencial)
3. Calcula score ponderado
4. Gera diagnostico com GPT-4o
5. Persiste resultados no banco
6. Gera alertas por flags criticos
7. Controla concorrencia com lock anti-duplicacao

---

## Scope

### IN Scope

- [x] Coleta de dados de todas as fontes (Asaas, Dom, formularios, WhatsApp)
- [x] Execucao paralela de agentes (financeiro + NPS)
- [x] Execucao sequencial do agente proximidade (busca mensagens)
- [x] Calculo do score ponderado (tipos.ts: `calcWeightedScore`)
- [x] Geracao de diagnostico (agente diagnostico)
- [x] Persistencia em `health_scores`
- [x] Persistencia de plano de acao em `action_items`
- [x] Geracao de alertas em `alerts` (por flags criticos)
- [x] Lock anti-duplicacao (analysis_logs com status running)
- [x] Periodo de observacao (< 60 dias = skip)
- [x] Log completo de execucao (analysis_logs)
- [x] Estimativa de custo em BRL
- [x] Suporte a trigger manual e scheduled (cron)
- [x] Fallback: WhatsApp opcional, diagnostico sem IA

### OUT of Scope

- Cron job em si (implementado separadamente em `api/cron/monthly-analysis`)
- UI do botao "Analisar Agora" (implementado na pagina do cliente)
- Envio de email pos-analise (futuro)

---

## Acceptance Criteria

### 1. Coleta de Dados
- [x] Busca dados do cliente com integracoes e agencia
- [x] Busca pagamentos Asaas via data-fetcher (chave descriptografada)
- [x] Busca pagamentos Dom via data-fetcher
- [x] Busca form_submissions dos ultimos 90 dias
- [x] Busca mensagens WhatsApp dos ultimos 60 dias (banco ou API live)

### 2. Execucao dos Agentes
- [x] Financeiro + NPS executados em paralelo (`Promise.all`)
- [x] Proximidade executada sequencialmente (precisa buscar mensagens)
- [x] Cada resultado armazenado em `agentsLog`
- [x] Se agente falha, nao quebra os outros (try/catch individual)
- [x] Proximidade com fallback: se WhatsApp nao conectado, retorna `null`

### 3. Calculo do Score
- [x] Usa `calcWeightedScore` com pesos: financeiro 35%, proximidade 30%, resultado 25%, NPS 10%
- [x] Pilares ausentes (null) excluidos automaticamente
- [x] Score sem dados = 50 (neutro)
- [x] Risco calculado: >= 70 baixo, >= 40 medio, < 40 alto

### 4. Diagnostico
- [x] Se OpenAI key disponivel: gera diagnostico com GPT-4o
- [x] Se nao: diagnostico basico com score e risco
- [x] Se GPT-4o falha: diagnostico de fallback
- [x] Plano de acao: array de acoes concretas

### 5. Persistencia
- [x] Insere em `health_scores`: scores, risco, diagnostico, flags, custo
- [x] Insere em `action_items`: cada acao do plano
- [x] Retorna `healthScoreId` para referencia

### 6. Alertas
- [x] Para cada flag critico, gera alerta na tabela `alerts`
- [x] Nao duplica alertas: verifica se ja existe alerta nao-lido do mesmo tipo
- [x] Severidade mapeada por flag (high/medium/low)
- [x] Mensagem formatada com nome do cliente

### 7. Lock Anti-Duplicacao
- [x] Cria `analysis_log` com status `running` ao iniciar
- [x] Verifica se existe outro log `running` < 5 min atras
- [x] Se sim: cancela e retorna `skipped`
- [x] Atualiza log para `completed` ao finalizar

### 8. Periodo de Observacao
- [x] Se cliente tem `contract_start` < 60 dias: skip
- [x] Motivo: dados insuficientes para analise confiavel
- [x] Registra skip em analysis_logs

### 9. Log de Execucao
- [x] `analysis_logs` com: status, agentsLog, tokens, custo, timestamps
- [x] Status: running → completed/failed/skipped
- [x] Timestamps: started_at, finished_at

### 10. Estimativa de Custo
- [x] Calcula custo em BRL: tokens / 1000 * R$ 0,055
- [x] Salva em `cost_brl` no health_scores e analysis_logs

---

## Technical Implementation

### Fluxo do Orquestrador (12 etapas)

```
1.  Cria analysis_log (status: running)
2.  Verifica lock (outro running < 5min?)
3.  Busca dados do cliente
4.  Verifica periodo de observacao (>= 60 dias)
5.  Busca dados das integracoes (Asaas, Dom)
6.  Coleta pagamentos via data-fetcher
7.  Roda agentes em paralelo (Financeiro + NPS)
8.  Busca mensagens WhatsApp + roda Proximidade
9.  Calcula score total ponderado
10. Gera diagnostico com GPT-4o
11. Persiste health_score + action_items + alerts
12. Atualiza analysis_log (status: completed)
```

### Interface

```typescript
interface OrchestratorInput {
  clientId:    string
  agencyId:    string
  triggeredBy: 'scheduled' | 'manual'
}

interface OrchestratorOutput {
  success:     boolean
  analysisId?: string
  result?:     AnalysisResult
  error?:      string
  skipped?:    boolean
  skipReason?: string
}
```

### Mapeamento de Flags para Alertas

```typescript
const FLAG_ALERTS = {
  'chargeback':          { severity: 'high',   message: '⚠️ {name}: Chargeback identificado' },
  'consecutive_overdue': { severity: 'high',   message: '⚠️ {name}: 2+ pagamentos consecutivos em atraso' },
  'long_overdue':        { severity: 'high',   message: '⚠️ {name}: Pagamento em atraso > 30 dias' },
  'cancellation_risk':   { severity: 'high',   message: '⚠️ {name}: Palavras de cancelamento no WhatsApp' },
  'nps_consecutive_low': { severity: 'high',   message: '⚠️ {name}: NPS baixo em 2 respostas consecutivas' },
  'nps_detractor':       { severity: 'medium', message: '{name}: Ultimo NPS indica detrator' },
  'form_silence':        { severity: 'medium', message: '{name}: Detrator sem resposta recente' },
  'silence':             { severity: 'medium', message: '{name}: Poucas mensagens no WhatsApp' },
  'no_form_response':    { severity: 'low',    message: '{name}: Sem resposta no formulario em 90 dias' },
}
```

### Busca de Mensagens WhatsApp (Dual Source)

```
1. Tenta banco local (whatsapp_messages) — populado via webhook
   |
   +-- Se encontrou msgs → usa
   |
   +-- Se vazio → fallback: API live Evolution
        |
        +-- Busca config da agencia (getAgencyEvolutionConfig)
        +-- fetchGroupMessages via Evolution API
        +-- Normaliza com extractMessageText
```

### Custo por Analise

| Componente | Tokens | Custo (USD) | Custo (BRL est.) |
|------------|--------|-------------|------------------|
| Proximidade (GPT-3.5 x semanas) | ~2400 | ~$0.005 | ~R$ 0.03 |
| Proximidade (GPT-4o analise) | ~500 | ~$0.015 | ~R$ 0.08 |
| Diagnostico (GPT-4o) | ~1000 | ~$0.025 | ~R$ 0.14 |
| **Total** | **~3900** | **~$0.045** | **~R$ 0.25** |

---

## File List

### Created Files
- [x] `src/lib/agents/orchestrator.ts` (16.867 bytes)

### Arquivos Relacionados
- `src/lib/agents/types.ts` — `calcWeightedScore`, `calcChurnRisk`, `AnalysisResult`
- `src/lib/agents/data-fetcher.ts` — `fetchPaymentsByCustomerFromDb`
- `src/lib/agents/financeiro.ts` — Agente Financeiro
- `src/lib/agents/nps.ts` — Agente NPS
- `src/lib/agents/proximidade.ts` — Agente Proximidade
- `src/lib/agents/diagnostico.ts` — Agente Diagnostico
- `src/lib/evolution/agency-config.ts` — `getAgencyEvolutionConfig`
- `src/lib/evolution/client.ts` — `fetchGroupMessages`, `extractMessageText`
- `src/lib/supabase/encryption.ts` — `decrypt`
- `src/app/api/analysis/[clientId]/route.ts` — Endpoint de analise manual
- `src/app/api/cron/monthly-analysis/route.ts` — Cron semanal

### Tabelas do Banco
- `health_scores` — Resultado da analise
- `action_items` — Plano de acao
- `alerts` — Alertas automaticos
- `analysis_logs` — Log de execucao

---

## Triggers de Analise

### 1. Analise Manual
```
POST /api/analysis/[clientId]
→ runAnalysis({ clientId, agencyId, triggeredBy: 'manual' })
```
Botao "Analisar Agora" na pagina do cliente.

### 2. Analise Automatica (Cron)
```
GET /api/cron/monthly-analysis (Vercel cron, segunda 9h UTC)
→ Para cada agencia → para cada cliente → runAnalysis({ triggeredBy: 'scheduled' })
```
Roda semanalmente para todos os clientes de todas as agencias.

---

## Decisoes Tecnicas

### 1. Financeiro + NPS em paralelo, Proximidade sequencial
- Financeiro e NPS nao dependem um do outro → `Promise.all`
- Proximidade precisa buscar mensagens do banco/API → sequencial
- Resultado: tempo total ~5-10s em vez de ~15-20s

### 2. Lock por tabela vs lock por campo
- Usar `analysis_logs.status = 'running'` como lock
- Janela de 5 min (previne stale locks)
- Mais simples que lock de banco (FOR UPDATE) e funciona com serverless

### 3. WhatsApp opcional
- Muitos clientes nao terao WhatsApp conectado inicialmente
- Pilar retorna `null` e e excluido do calculo ponderado
- Score parcial (financeiro + NPS) e melhor que nenhum score

### 4. Dual source para mensagens
- Webhook popula `whatsapp_messages` em tempo real (preferido)
- Fallback: busca API live se banco vazio
- Garante que analise funciona mesmo se webhook falhou

### 5. Deduplicacao de alertas
- Verifica se ja existe alerta nao-lido do mesmo tipo/cliente
- Previne spam de alertas quando analise roda semanalmente
- Alerta so e recriado se usuario marcou o anterior como lido

---

## Quality Gates

- [x] TypeScript compila sem erros
- [x] Lint passa
- [x] Lock anti-duplicacao funciona
- [x] Periodo de observacao respeita 60 dias
- [x] Score ponderado calcula corretamente com pilares ausentes
- [x] Alertas nao duplicam
- [x] Log de execucao completo (tokens, custo, timestamps)
- [x] Fallbacks funcionam (sem WhatsApp, sem OpenAI, agente falha)
- [x] Testado com analise manual (botao)
- [x] Testado com cron

---

## Metricas de Performance

| Metrica | Valor | Meta |
|---------|-------|------|
| Tempo total por cliente | 5-15s | < 15s |
| Tempo financeiro | 0.05s | < 1s |
| Tempo NPS | 0.01s | < 1s |
| Tempo proximidade | 3-10s | < 10s |
| Tempo diagnostico | 2-5s | < 5s |
| Custo por analise | ~R$ 0.25 | < R$ 0.50 |
| Tokens por analise | ~3900 | < 5000 |

---

## Dependencies

- Agente Financeiro (HS-1) implementado
- Agente NPS (HS-2) implementado
- Agente Proximidade (HS-3) implementado
- Agente Diagnostico (HS-4) implementado
- Data Fetcher implementado
- Tabelas: health_scores, action_items, alerts, analysis_logs
- Supabase service role key (para operacoes admin)
- OpenAI API key (opcional, tem fallback)

---

**Story completed on:** Sprint 3
**Complexidade:** Maior story do epic (13 pontos). 16.867 bytes de codigo.
**Retrospectiva:** O orquestrador e o coracao do sistema. Decisao de executar agentes em paralelo reduziu tempo em ~40%. Lock simples por tabela funcionou melhor que soluções mais complexas. Dual source para WhatsApp (banco + API) foi acerto de resiliencia.
