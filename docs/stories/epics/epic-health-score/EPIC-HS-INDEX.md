# Epic Health Score — Motor de IA Preditiva

**Epic ID:** EPIC-HS
**Status:** ✅ 100% Concluido (5/5 stories)
**Priority:** Critical
**Lead:** @architect (Aria) + @dev (Dex)
**Sprint:** 3

---

## Visao Geral

Sistema de **analise preditiva de churn** baseado em 4 pilares, cada um com um agente especializado, mais um orquestrador que coordena a execucao e um agente de diagnostico que gera plano de acao com GPT-4o.

**Objetivo:** Gerar um **Health Score de 0-100** para cada cliente, combinando dados financeiros, NPS, sentimento em WhatsApp e diagnostico por IA, permitindo acoes preventivas antes do cancelamento.

**Valor de Negocio:**
- Prever cancelamentos com 30-60 dias de antecedencia
- Gerar plano de acao personalizado por cliente
- Reduzir churn de 15% para menos de 5%
- Automatizar analises semanais para todas as agencias

---

## Problema Resolvido

### Antes:
- Gestor so percebia insatisfacao quando cliente cancelava
- Dados espalhados: pagamentos num lugar, WhatsApp noutro, NPS noutro
- Sem indicadores quantitativos de risco
- Acoes reativas (apagar incendio)

### Depois:
- Health Score unificado (0-100) com 4 pilares
- Analise automatica semanal por cron job
- Flags criticos com alertas proativos
- Diagnostico por IA com plano de acao personalizado
- Historico de evolucao do score ao longo do tempo

---

## Arquitetura do Motor de IA

### Pipeline de Analise

```
Orquestrador (orchestrator.ts)
   |
   |-- 1. Coleta dados (data-fetcher.ts)
   |      |-- Asaas API (pagamentos)
   |      |-- Dom Pagamentos API
   |      |-- form_submissions (NPS)
   |      +-- whatsapp_messages (sentimento)
   |
   |-- 2. Executa agentes em paralelo
   |      |-- Agente Financeiro (financeiro.ts)     --> score 0-100
   |      +-- Agente NPS (nps.ts)                   --> score resultado + score NPS
   |
   |-- 3. Executa agente sequencial
   |      +-- Agente Proximidade (proximidade.ts)   --> score 0-100 (GPT-3.5 + GPT-4o)
   |
   |-- 4. Calcula score ponderado (types.ts)
   |
   |-- 5. Gera diagnostico (diagnostico.ts)         --> GPT-4o
   |
   +-- 6. Persiste resultados + gera alertas
```

### Pesos dos Pilares (types.ts)

| Pilar | Peso | Agente | IA? |
|-------|------|--------|-----|
| **Financeiro** | 35% | `financeiro.ts` | Nao (logica pura) |
| **Proximidade** | 30% | `proximidade.ts` | Sim (GPT-3.5 + GPT-4o) |
| **Resultado** | 25% | `nps.ts` | Nao (logica pura) |
| **NPS** | 10% | `nps.ts` | Nao (logica pura) |

**Nota:** Pilares ausentes (score `null`) nao penalizam — apenas os pilares com dados sao usados no calculo ponderado.

### Thresholds de Risco

| Score | Risco | Cor |
|-------|-------|-----|
| 70-100 | Baixo | Verde |
| 40-69 | Medio | Amarelo |
| 0-39 | Alto | Vermelho |

---

## Stories

| Story ID | Nome | Status | Points | Arquivo |
|----------|------|--------|--------|---------|
| HS-1 | Agente Financeiro | ✅ Done | 5 | `story-hs-1-financial-agent.md` |
| HS-2 | Agente NPS (Resultado + NPS) | ✅ Done | 5 | `story-hs-2-nps-agent.md` |
| HS-3 | Agente Proximidade | ✅ Done | 8 | `story-hs-3-proximity-agent.md` |
| HS-4 | Agente Diagnostico | ✅ Done | 5 | `story-hs-4-diagnostic-agent.md` |
| HS-5 | Orquestrador de Analise | ✅ Done | 13 | `story-hs-5-orchestrator.md` |

**Total Story Points:** 36

---

## Arquivos do Motor de IA

```
src/lib/agents/
  |-- types.ts                # Tipos compartilhados + pesos + calculos
  |-- data-fetcher.ts         # Coleta dados de Asaas/Dom para os agentes
  |-- financeiro.ts           # Agente Financeiro (logica pura, sem IA)
  |-- nps.ts                  # Agente NPS + Resultado (logica pura)
  |-- proximidade.ts          # Agente Proximidade (GPT-3.5 + GPT-4o)
  |-- diagnostico.ts          # Agente Diagnostico (GPT-4o)
  +-- orchestrator.ts         # Orquestrador principal
```

---

## Flags Criticos (todos os agentes)

### Alta Severidade
| Flag | Agente | Significado |
|------|--------|-------------|
| `chargeback` | Financeiro | Pagamento estornado |
| `consecutive_overdue` | Financeiro | 2+ atrasos consecutivos |
| `long_overdue` | Financeiro | Atraso > 30 dias |
| `cancellation_risk` | Proximidade | Palavras de cancelamento no WhatsApp |
| `nps_consecutive_low` | NPS | NPS <= 6 em 2 respostas consecutivas |

### Media Severidade
| Flag | Agente | Significado |
|------|--------|-------------|
| `nps_detractor` | NPS | Ultimo NPS <= 6 |
| `form_silence` | NPS | Detrator + sem resposta nos ultimos 30 dias |
| `silence` | Proximidade | < 5 mensagens em 60 dias |

### Baixa Severidade
| Flag | Agente | Significado |
|------|--------|-------------|
| `no_payment_data` | Financeiro | Sem dados financeiros integrados |
| `no_form_response` | NPS | Sem formulario respondido em 90 dias |
| `no_whatsapp_data` | Proximidade | WhatsApp nao conectado |
| `negative_sentiment` | Proximidade | Sentimento geral negativo |

---

## Tabelas do Banco

### health_scores
Armazena resultado de cada analise:
- `score_total`, `score_financeiro`, `score_proximidade`, `score_resultado`, `score_nps`
- `churn_risk` (low/medium/high)
- `diagnosis` (texto gerado por GPT-4o)
- `flags` (array JSONB)
- `tokens_used`, `cost_brl`

### action_items
Plano de acao gerado pelo agente diagnostico:
- `health_score_id` (FK)
- `text` (acao concreta)

### alerts
Alertas gerados automaticamente por flags criticos:
- `type` (flag name)
- `severity` (high/medium/low)
- `message` (mensagem formatada)
- `is_read` (controle de leitura)

### analysis_logs
Log de execucao de cada analise:
- `status` (running/completed/failed/skipped)
- `agents_log` (JSONB com resultado de cada agente)
- `tokens_used`, `cost_brl`
- `started_at`, `finished_at`

---

## Metricas de Sucesso

| Metrica | Baseline | Atual | Meta |
|---------|----------|-------|------|
| **Tempo de analise por cliente** | - | 5-15s | < 15s |
| **Custo por analise** | - | ~$0.02-0.05 | < $0.05 |
| **Acuracia preditiva** | - | A validar | > 80% |
| **Uptime do motor** | - | 99.9% | > 99.9% |

---

## Decisoes Tecnicas Chave

### 1. Agentes sem IA vs com IA
- **Financeiro e NPS:** Logica pura (regras de scoring deterministicas) — mais rapido, mais barato, mais previsivel
- **Proximidade:** IA necessaria para analise de sentimento em linguagem natural
- **Diagnostico:** IA necessaria para gerar plano de acao personalizado

### 2. GPT-4o-mini vs GPT-4o
- **Proximidade (sumarizacao):** GPT-3.5-turbo (barato, rapido)
- **Proximidade (analise):** GPT-4o (mais inteligente para sentimento)
- **Diagnostico:** GPT-4o (analise holistisca complexa)
- **Resultado:** Custo medio ~$0.03 por analise completa

### 3. Pilares opcionais
- Pilares sem dados retornam `score: null` e sao excluidos do calculo ponderado
- Isso permite analise parcial (ex: cliente sem WhatsApp ainda tem score baseado em financeiro + NPS)

### 4. Lock anti-duplicacao
- Usa tabela `analysis_logs` com status `running` e timestamp
- Previne analises simultaneas para o mesmo cliente (janela de 5 min)

---

## Proximos Passos

- [ ] Calibrar pesos dos pilares com dados reais (20+ clientes)
- [ ] Calibrar thresholds de flags
- [ ] Validar acuracia preditiva (comparar previsoes vs cancelamentos reais)
- [ ] Otimizar prompts do agente Proximidade
- [ ] Adicionar mais palavras-chave de cancelamento
- [ ] Implementar cache de analises recentes (Redis)
- [ ] Dashboard com evolucao do Health Score ao longo do tempo

---

**Epic documentado em:** 21 de Fevereiro de 2026
**Metodologia:** AIOS Story-Driven Development (Retrospectiva)
**Ultima atualizacao:** 21 de Fevereiro de 2026
