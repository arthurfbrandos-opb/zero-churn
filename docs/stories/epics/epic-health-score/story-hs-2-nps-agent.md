# Story HS-2: Agente NPS (Resultado + NPS)

**Epic:** Health Score — Motor de IA Preditiva (EPIC-HS)
**Story ID:** HS-2
**Priority:** High
**Points:** 5
**Effort:** 1-2 dias
**Status:** ✅ Done
**Type:** Feature
**Lead:** @dev (Dex)
**Repository:** zero-churn
**Sprint:** 3 (Tasks S3-04, S3-05, S3-06)

---

## User Story

**Como** gestor de agencia,
**Quero** que o sistema analise automaticamente as respostas de NPS e satisfacao dos meus clientes,
**Para** detectar detratores e clientes insatisfeitos antes que cancelem.

---

## Objective

Implementar agente que analisa respostas do formulario de satisfacao (`/f/[token]`), calculando dois scores separados:
- **Score Resultado (25%):** Impacto percebido dos servicos nos resultados do cliente
- **Score NPS (10%):** Probabilidade de indicacao (Net Promoter Score)

Ambos sao baseados em logica pura (sem IA), com flags criticos para detratores e silencio.

---

## Scope

### IN Scope

- [x] Dois scores independentes a partir de um unico agente
- [x] Score Resultado normalizado (nota 0-10 → score 0-100)
- [x] Score NPS normalizado (nota 0-10 → score 0-100)
- [x] Janela de analise: ultimos 90 dias
- [x] Penalidade por silencio (sem resposta nos ultimos 30 dias)
- [x] Deteccao de detratores (NPS <= 6)
- [x] Deteccao de detratores consecutivos
- [x] Flag combinado: detrator + silencio

### OUT of Scope

- Analise de sentimento nos comentarios (feito pelo Proximidade)
- Envio de lembretes (feito pelo cron `form-reminders`)
- Criacao do formulario NPS (ja implementado no Sprint 2)

---

## Acceptance Criteria

### 1. Score Resultado (peso 25%)
- [x] Calcula media das notas de resultado dos ultimos 90 dias
- [x] Normaliza: nota * 10 (escala 0-10 → 0-100)
- [x] Penalidade -10 pts se sem resposta nos ultimos 30 dias
- [x] Retorna `null` se sem resposta nos ultimos 90 dias (pilar ausente)
- [x] Flag `no_form_response` quando sem dados

### 2. Score NPS (peso 10%)
- [x] Calcula media das notas NPS dos ultimos 90 dias
- [x] Normaliza: nota * 10 (escala 0-10 → 0-100)
- [x] Penalidade -10 pts se sem resposta nos ultimos 30 dias
- [x] Retorna `null` se sem resposta nos ultimos 90 dias
- [x] Flag `nps_detractor` se ultima resposta NPS <= 6
- [x] Flag `nps_consecutive_low` se 2 respostas consecutivas NPS <= 6
- [x] Flag `form_silence` se detrator + sem resposta em 30 dias

### 3. Interface de Retorno
- [x] Retorna objeto com duas chaves: `{ resultado: AgentResult, nps: AgentResult }`
- [x] Cada um com score, flags, details, status, durationMs
- [x] Compativel com orquestrador

### 4. Detalhes no Output
- [x] Media de resultado / NPS
- [x] Ultimo NPS registrado
- [x] Numero de respostas no periodo
- [x] Data da ultima resposta
- [x] Flag de penalidade por silencio

---

## Technical Implementation

### Regras de Scoring

```
Score Resultado (0-100):
  Base = media(notas_resultado_90d) * 10
  Penalidade: sem resposta nos ultimos 30d → -10 pts
  Sem dados em 90d → score null (pilar ausente)

Score NPS (0-100):
  Base = media(notas_nps_90d) * 10
  Penalidade: sem resposta nos ultimos 30d → -10 pts
  Sem dados em 90d → score null (pilar ausente)

Flags:
  nps_detractor        → ultimo NPS <= 6
  nps_consecutive_low  → 2 NPS consecutivos <= 6
  no_form_response     → sem resposta em 90 dias
  form_silence         → detrator + sem resposta em 30 dias
```

### Tipos de Entrada

```typescript
interface FormSubmission {
  id:             string
  submittedAt:    string  // ISO datetime
  npsScore:       number  // 0-10
  scoreResultado: number  // 0-10
  comment:        string | null
}

interface NpsInput {
  clientId:      string
  submissions:   FormSubmission[]
  referenceDate?: string   // padrao: hoje
}
```

### Assinatura da Funcao

```typescript
export async function runAgenteNps(input: NpsInput): Promise<{
  resultado: AgentResult
  nps:       AgentResult
}>
```

### Cadencia

- Formulario NPS e enviado **1x por mes** pela agencia
- Cron `form-reminders` envia lembrete se nao respondeu em 30 dias
- Analise de Health Score roda **semanalmente** mas opera sobre janela de 90 dias

---

## File List

### Created Files
- [x] `src/lib/agents/nps.ts` (6.214 bytes)

### Modified Files
- Nenhum (nova implementacao)

### Arquivos Relacionados
- `src/app/f/[token]/page.tsx` — Formulario NPS publico
- `src/app/api/cron/form-reminders/route.ts` — Cron de lembretes
- `src/lib/nps-utils.ts` — Utilidades NPS

---

## Exemplos de Output

### Cliente com NPS saudavel
```json
{
  "resultado": {
    "agent": "resultado",
    "score": 80,
    "flags": [],
    "details": {
      "avgResultado": 8.0,
      "responses": 3,
      "lastResponse": "2026-02-10T12:00:00Z"
    },
    "status": "success"
  },
  "nps": {
    "agent": "nps",
    "score": 90,
    "flags": [],
    "details": {
      "avgNps": 9.0,
      "lastNps": 9,
      "responses": 3,
      "lastResponse": "2026-02-10T12:00:00Z"
    },
    "status": "success"
  }
}
```

### Cliente detrator
```json
{
  "resultado": {
    "agent": "resultado",
    "score": 40,
    "flags": [],
    "details": { "avgResultado": 4.0, "responses": 2 },
    "status": "success"
  },
  "nps": {
    "agent": "nps",
    "score": 30,
    "flags": ["nps_detractor", "nps_consecutive_low"],
    "details": { "avgNps": 3.0, "lastNps": 4, "responses": 2 },
    "status": "success"
  }
}
```

### Cliente sem respostas
```json
{
  "resultado": {
    "agent": "resultado",
    "score": null,
    "flags": ["no_form_response"],
    "details": { "reason": "Nenhuma resposta nos ultimos 90 dias" },
    "status": "skipped"
  },
  "nps": {
    "agent": "nps",
    "score": null,
    "flags": ["no_form_response"],
    "details": { "reason": "Nenhuma resposta nos ultimos 90 dias" },
    "status": "skipped"
  }
}
```

---

## Decisao Tecnica: Dois Scores em Um Agente

**Por que um agente retorna dois scores?**

O formulario NPS do Zero Churn tem 2 perguntas obrigatorias:
1. "Qual o impacto dos nossos servicos nos seus resultados?" (0-10) → **Score Resultado**
2. "Qual a chance de nos indicar?" (0-10) → **Score NPS**

Sao metricas correlacionadas mas distintas:
- **Resultado** mede satisfacao com entregas (peso 25%)
- **NPS** mede lealdade/indicacao (peso 10%)

Manter em um unico agente evita duplicacao de queries e garante consistencia temporal.

---

## Quality Gates

- [x] TypeScript compila sem erros
- [x] Lint passa
- [x] Testado com cenarios: respostas recentes, sem respostas, detratores
- [x] Score calculado corretamente para todos os edge cases
- [x] Flags ativados corretamente

---

## Dependencies

- Formulario NPS implementado (`/f/[token]`) — Sprint 2
- Tabela `form_submissions` com colunas `nps_score` e `score_resultado`
- Cron `form-reminders` para garantir coleta de dados

---

**Story completed on:** Sprint 3
**Peso no Health Score:** Resultado 25% + NPS 10% = 35% combinado
**Retrospectiva:** Design elegante de retornar dois scores de um unico agente. Logica pura, deterministica, sem custo de IA.
