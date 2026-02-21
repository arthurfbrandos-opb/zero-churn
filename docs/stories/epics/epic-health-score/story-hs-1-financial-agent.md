# Story HS-1: Agente Financeiro

**Epic:** Health Score — Motor de IA Preditiva (EPIC-HS)
**Story ID:** HS-1
**Priority:** High
**Points:** 5
**Effort:** 1-2 dias
**Status:** ✅ Done
**Type:** Feature
**Lead:** @dev (Dex)
**Repository:** zero-churn
**Sprint:** 3 (Tasks S3-01, S3-02, S3-03)

---

## User Story

**Como** gestor de agencia,
**Quero** que o sistema analise automaticamente o comportamento de pagamento dos meus clientes,
**Para** identificar riscos financeiros (atrasos, chargebacks) antes que se tornem cancelamentos.

---

## Objective

Implementar agente que analisa dados de pagamento ja coletados do Asaas e Dom Pagamentos, gerando um score de 0-100 baseado em regras deterministicas (sem IA), com flags criticos para situacoes de risco.

---

## Scope

### IN Scope

- [x] Scoring baseado em regras (logica pura, sem IA)
- [x] Penalidades por overdue (1-7d, 8-30d, 31+ dias)
- [x] Deteccao de chargebacks
- [x] Deteccao de atrasos consecutivos
- [x] Flags criticos: `chargeback`, `consecutive_overdue`, `long_overdue`, `no_payment_data`
- [x] Normalizacao de pagamentos Asaas + Dom
- [x] Data fetcher para coleta de pagamentos

### OUT of Scope

- Chamadas diretas para APIs externas durante analise (usa dados ja coletados)
- Machine Learning / treinamento de modelo
- Previsao de atraso futuro (feature futura)

---

## Acceptance Criteria

### 1. Scoring Funciona Corretamente
- [x] Score base = 100 pontos
- [x] Penalidade por overdue 1-7 dias: -10 pts
- [x] Penalidade por overdue 8-30 dias: -20 pts
- [x] Penalidade por overdue 31+ dias: -35 pts + flag `long_overdue`
- [x] Penalidade por chargeback: -40 pts + flag `chargeback`
- [x] Penalidade por 2+ atrasos consecutivos: -15 pts + flag `consecutive_overdue`
- [x] Penalidade total de overdue limitada a 50 pts (nao zera o score)
- [x] Score final clamped entre 0 e 100

### 2. Sem Dados Financeiros
- [x] Se nenhum pagamento encontrado, retorna `score: null`
- [x] Flag `no_payment_data` ativado
- [x] Status `skipped` (nao penaliza no calculo ponderado)

### 3. Detalhes no Output
- [x] Total de pagamentos analisados
- [x] Quantidade recebidos, pendentes, overdue
- [x] Valor total recebido e valor em atraso
- [x] Fontes (asaas vs dom)
- [x] Detalhes de cada overdue (id, dias de atraso, valor)
- [x] Recencia: se houve overdue/chargeback nos ultimos 7 dias

### 4. Data Fetcher Funciona
- [x] Busca chave Asaas da agencia (criptografada AES-256)
- [x] Descriptografa corretamente (`decrypt<{ api_key: string }>`)
- [x] Busca pagamentos por dueDate (nao paymentDate)
- [x] Tres batches paralelos: RECEIVED, PENDING, OVERDUE
- [x] Deduplicacao por payment ID
- [x] Busca pagamentos Dom via `fetchPaidTransactions`
- [x] Normaliza formato para `NormalizedPayment`

### 5. Interface AgentResult
- [x] Retorna `AgentResult` padrao: agent, score, flags, details, status, durationMs
- [x] Compativel com orquestrador

---

## Technical Implementation

### Regras de Scoring

```
Base: 100 pontos

Penalidades:
  OVERDUE (em atraso):
    1-7 dias:   -10 pts
    8-30 dias:  -20 pts
    31+ dias:   -35 pts (+ flag 'long_overdue')

  2+ atrasos consecutivos: -15 pts extras (flag 'consecutive_overdue')
  Chargeback detectado:    -40 pts (flag 'chargeback')

  Limite overdue: max -50 pts (nao zera o score)

Score final: clamp(0, 100)
```

### Tipos Internos

```typescript
interface PaymentRow {
  id:          string
  status:      string       // RECEIVED | CONFIRMED | OVERDUE | CHARGEBACK...
  dueDate:     string       // ISO date
  paymentDate: string | null
  value:       number
  netValue:    number
  fonte:       'asaas' | 'dom'
}

interface FinanceiroInput {
  clientId:      string
  asaasPayments: PaymentRow[]
  domPayments:   PaymentRow[]
  startDate:     string
  endDate:       string
}
```

### Status de Pagamento Reconhecidos

| Status | Categoria | Impacto |
|--------|-----------|---------|
| `RECEIVED` | Pago | Nenhum |
| `CONFIRMED` | Pago | Nenhum |
| `RECEIVED_IN_CASH` | Pago | Nenhum |
| `PENDING` | Pendente | Nenhum |
| `OVERDUE` | Em atraso | Penalidade proporcional |
| `CHARGEBACK_REQUESTED` | Chargeback | -40 pts |
| `CHARGEBACK_DISPUTE` | Chargeback | -40 pts |
| `CHARGEBACK` | Chargeback | -40 pts |
| `REFUNDED` | Chargeback | -40 pts |

---

## File List

### Created Files
- [x] `src/lib/agents/financeiro.ts` (7.765 bytes)
- [x] `src/lib/agents/data-fetcher.ts` (9.163 bytes)
- [x] `src/lib/agents/types.ts` (3.363 bytes) — compartilhado

### Modified Files
- Nenhum (nova implementacao)

---

## Bugs Corrigidos

### Bug: `no_payment_data` mesmo com Asaas conectado
- **Data:** 20/02/2026
- **Causa:** Descriptografia retornava objeto `{ api_key: string }` mas codigo tratava como string
- **Fix:** Usar `decrypt<{ api_key: string }>` e extrair `.api_key`
- **Commit:** `8ace0d7`
- **Impacto:** 100% dos clientes com Asaas mostravam `no_payment_data` incorretamente

### Bug: Filtro por paymentDate em vez de dueDate
- **Causa:** Pagamentos OVERDUE nao tem `paymentDate`, logo nao apareciam
- **Fix:** Usar `dueDate` como filtro em todas as queries
- **Impacto:** Atrasos nao eram detectados

---

## Quality Gates

- [x] TypeScript compila sem erros
- [x] Lint passa
- [x] Testado com dados reais (Asaas)
- [x] Score calculado corretamente para cenarios: limpo, overdue, chargeback
- [x] Logs detalhados para debug

---

## Exemplos de Output

### Cliente com pagamentos em dia
```json
{
  "agent": "financeiro",
  "score": 100,
  "flags": [],
  "details": {
    "totalPayments": 6,
    "received": 6,
    "pending": 0,
    "overdue": 0,
    "totalReceived": 12000,
    "totalOverdue": 0
  },
  "status": "success",
  "durationMs": 45
}
```

### Cliente com atraso e chargeback
```json
{
  "agent": "financeiro",
  "score": 25,
  "flags": ["chargeback", "long_overdue", "consecutive_overdue"],
  "details": {
    "totalPayments": 6,
    "received": 3,
    "overdue": 2,
    "chargebacks": 1,
    "maxConsecutiveOverdues": 2,
    "totalOverdue": 4000
  },
  "status": "success",
  "durationMs": 52
}
```

---

## Dependencies

- Integracao Asaas configurada na agencia (Sprint 2)
- Integracao Dom Pagamentos configurada (Sprint 2)
- Tabela `agency_integrations` com chaves criptografadas
- Tabela `client_integrations` com `customer_id` vinculado

---

**Story completed on:** Sprint 3
**Peso no Health Score:** 35%
**Retrospectiva:** Agente mais simples e determinístico. Bug da descriptografia foi o mais critico — afetava 100% das analises.
