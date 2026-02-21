# Story HS-3: Agente Proximidade

**Epic:** Health Score — Motor de IA Preditiva (EPIC-HS)
**Story ID:** HS-3
**Priority:** High
**Points:** 8
**Effort:** 3-4 dias
**Status:** ✅ Done
**Type:** Feature
**Lead:** @dev (Dex) + @architect (Aria)
**Repository:** zero-churn
**Sprint:** 3 (Tasks S3-07, S3-08, S3-09, S3-10)

---

## User Story

**Como** gestor de agencia,
**Quero** que o sistema analise automaticamente o sentimento nas conversas de WhatsApp dos meus clientes,
**Para** detectar sinais de insatisfacao, afastamento ou intencao de cancelamento nas interacoes do dia-a-dia.

---

## Objective

Implementar agente que analisa mensagens de WhatsApp do grupo do cliente usando um pipeline de 2 etapas com IA:
1. **GPT-3.5-turbo:** Sumariza mensagens por semana (barato, rapido)
2. **GPT-4o:** Analisa os resumos semanais e gera score de sentimento (inteligente, preciso)

Inclui deteccao de palavras-chave de cancelamento e fallback heuristico quando OpenAI nao esta disponivel.

---

## Scope

### IN Scope

- [x] Pipeline de 2 etapas: sumarizacao (GPT-3.5) + analise (GPT-4o)
- [x] Batching semanal de mensagens
- [x] Deteccao de palavras-chave de cancelamento (PT-BR)
- [x] Analise de sentimento: positive / neutral / negative
- [x] Nivel de engajamento: high / medium / low
- [x] Deteccao de silencio (< 5 msgs em 60 dias)
- [x] Fallback heuristico (sem OpenAI key)
- [x] Peso maior na semana mais recente
- [x] Flags: `silence`, `cancellation_risk`, `negative_sentiment`, `no_whatsapp_data`

### OUT of Scope

- Coleta de mensagens (feito pelo orchestrator/webhook)
- Conexao WhatsApp (Epic WhatsApp)
- Resposta automatica a mensagens

---

## Acceptance Criteria

### 1. Pipeline de Sumarizacao (GPT-3.5-turbo)
- [x] Agrupa mensagens em batches semanais (ISO week)
- [x] Maximo 50 mensagens por batch (trunca texto em 200 chars)
- [x] Gera paragrafo conciso (max 100 palavras) por semana
- [x] Prompt em portugues: engajamento, tom, temas, sinais preocupantes
- [x] Temperatura: 0.3 (consistente)
- [x] Max tokens: 200

### 2. Analise Final (GPT-4o)
- [x] Recebe resumos semanais (do mais antigo ao mais recente)
- [x] Semana mais recente marcada com `[SEMANA MAIS RECENTE]` (peso maior)
- [x] Retorna JSON com: score, sentiment, engagementLevel, flags, summary
- [x] response_format: json_object (garante JSON valido)
- [x] Temperatura: 0.2 (determinístico)
- [x] Max tokens: 500

### 3. Criterios de Score
- [x] 80-100: Comunicacao frequente e positiva
- [x] 60-79: Comunicacao regular, tom neutro a positivo
- [x] 40-59: Comunicacao escassa ou tom neutro
- [x] 20-39: Comunicacao rara ou tom negativo
- [x] 0-19: Silencio quase total ou sinais fortes de cancelamento

### 4. Deteccao de Cancelamento
- [x] 16 palavras-chave em PT-BR: cancelar, cancelamento, rescindir, rescisao, insatisfeito, etc.
- [x] Busca case-insensitive em todo o texto
- [x] Adiciona flag `cancellation_risk` mesmo que GPT nao detecte

### 5. Silencio
- [x] < 5 mensagens em 60 dias = score 30 + flag `silence`
- [x] Retorno imediato (nao gasta tokens de IA)

### 6. Sem WhatsApp
- [x] groupId = null → score null + flag `no_whatsapp_data`
- [x] Status: `skipped`
- [x] Nao penaliza no calculo ponderado

### 7. Fallback Heuristico (sem OpenAI key)
- [x] Score base = 50 + (num_mensagens / 2), max 100
- [x] Se palavras de cancelamento: score - 30 (min 20)
- [x] Mode: `heuristic (no OpenAI key)`

### 8. Tratamento de Erros
- [x] Try/catch global retorna `status: 'error'` com mensagem
- [x] Nao quebra o orquestrador

---

## Technical Implementation

### Pipeline

```
Mensagens WhatsApp (ultimos 60 dias)
  |
  +-- Filtrar: texto nao vazio
  |
  +-- < 5 msgs? → score 30, flag 'silence'
  |
  +-- Sem OpenAI? → score heuristico
  |
  +-- Agrupar por semana ISO
  |     |
  |     +-- Semana 1: GPT-3.5 → resumo 1
  |     +-- Semana 2: GPT-3.5 → resumo 2
  |     +-- ...
  |     +-- Semana N: GPT-3.5 → resumo N
  |
  +-- GPT-4o analisa todos os resumos
  |     |
  |     +-- Score 0-100
  |     +-- Sentiment: positive/neutral/negative
  |     +-- Engagement: high/medium/low
  |     +-- Flags
  |     +-- Summary (2-3 frases)
  |
  +-- Merge flags (GPT + palavras-chave)
  |
  +-- Retorna AgentResult
```

### Palavras-Chave de Cancelamento (PT-BR)

```typescript
const CANCEL_KEYWORDS = [
  'cancelar', 'cancelamento', 'rescindir', 'rescisao',
  'encerrar contrato', 'nao quero mais', 'quero parar',
  'insatisfeito', 'descontente', 'decepcionado',
  'pessimo', 'horrivel', 'terrivel',
  'abandonar', 'mudar de agencia',
]
```

### Prompt de Sumarizacao (GPT-3.5)

```
Voce e um analista de relacionamento entre uma agencia de marketing
e seu cliente. Analise o trecho de conversas de WhatsApp e escreva
um paragrafo conciso (max 100 palavras) descrevendo: o nivel de
engajamento, o tom geral da comunicacao, temas principais discutidos
e qualquer sinal preocupante. Responda APENAS o paragrafo.
```

### Prompt de Analise (GPT-4o)

```
Voce e um especialista em analise de relacionamento entre agencias
de marketing e seus clientes. A semana mais recente (marcada como
[SEMANA MAIS RECENTE]) deve ter peso maior na avaliacao do estado
atual do relacionamento. As semanas anteriores fornecem contexto
historico e tendencias.

Retorne JSON com: score, sentiment, engagementLevel, flags, summary
```

### Custo Estimado

| Etapa | Modelo | Tokens (est.) | Custo |
|-------|--------|---------------|-------|
| Sumarizacao (por semana) | GPT-3.5-turbo | ~300 | ~$0.001 |
| Analise final | GPT-4o | ~500 | ~$0.015 |
| **Total (8 semanas)** | - | ~2.900 | **~$0.02** |

---

## File List

### Created Files
- [x] `src/lib/agents/proximidade.ts` (12.340 bytes)

### Arquivos Relacionados
- `src/lib/agents/orchestrator.ts` — Coleta mensagens e passa ao agente
- `src/lib/evolution/client.ts` — `fetchGroupMessages`, `extractMessageText`
- Tabela `whatsapp_messages` — Mensagens recebidas via webhook

---

## Exemplos de Output

### Cliente engajado e positivo
```json
{
  "agent": "proximidade",
  "score": 85,
  "flags": [],
  "details": {
    "totalMessages": 127,
    "period": "60 dias",
    "sentiment": "positive",
    "engagementLevel": "high",
    "summary": "Esta semana o cliente demonstrou entusiasmo...",
    "weeklyBatches": 8,
    "tokensEstimate": 2900
  },
  "status": "success"
}
```

### Cliente com sinais de cancelamento
```json
{
  "agent": "proximidade",
  "score": 25,
  "flags": ["negative_sentiment", "cancellation_risk"],
  "details": {
    "totalMessages": 43,
    "sentiment": "negative",
    "engagementLevel": "low",
    "summary": "Esta semana o cliente expressou insatisfacao..."
  },
  "status": "success"
}
```

### Cliente em silencio
```json
{
  "agent": "proximidade",
  "score": 30,
  "flags": ["silence"],
  "details": {
    "totalMessages": 3,
    "period": "60 dias",
    "reason": "Menos de 5 mensagens no periodo"
  },
  "status": "success"
}
```

---

## Decisoes Tecnicas

### 1. Por que pipeline de 2 etapas?
- GPT-3.5 e 10x mais barato que GPT-4o
- Sumarizacao reduz volume de tokens enviados ao GPT-4o
- GPT-4o e mais inteligente para analise de sentimento nuanciada
- Resultado: custo ~$0.02 em vez de ~$0.15 se tudo fosse GPT-4o

### 2. Por que peso maior na semana mais recente?
- Analise roda semanalmente (cron)
- O estado ATUAL do relacionamento importa mais que historico
- Semanas anteriores servem como contexto de tendencia

### 3. Por que palavras-chave alem da IA?
- IA pode nao detectar intencao de cancelamento explicita
- Palavras-chave sao determinísticas (nunca perdem)
- Merge garante que ambos os metodos contribuem

---

## Quality Gates

- [x] TypeScript compila sem erros
- [x] Lint passa
- [x] Testado com mensagens reais de grupo
- [x] Fallback heuristico funciona sem OpenAI key
- [x] Silencio detectado corretamente
- [x] JSON sempre valido (response_format)
- [x] Error handling nao quebra orquestrador

---

## Dependencies

- WhatsApp conectado (Epic WhatsApp WPP-1)
- Grupo vinculado ao cliente (WPP-2)
- Webhook recebendo mensagens (tabela `whatsapp_messages`)
- OpenAI API key configurada (opcional — tem fallback)

---

**Story completed on:** Sprint 3
**Peso no Health Score:** 30%
**Retrospectiva:** Agente mais complexo e caro, mas essencial para detectar sentimento. Pipeline de 2 etapas foi decisao critica para viabilidade de custo. Palavras-chave de cancelamento como safety net foram acerto.
