# Story HS-4: Agente Diagnostico

**Epic:** Health Score — Motor de IA Preditiva (EPIC-HS)
**Story ID:** HS-4
**Priority:** High
**Points:** 5
**Effort:** 1-2 dias
**Status:** ✅ Done
**Type:** Feature
**Lead:** @dev (Dex)
**Repository:** zero-churn
**Sprint:** 3 (Task S3-12)

---

## User Story

**Como** gestor de agencia,
**Quero** receber um diagnostico escrito e um plano de acao personalizado para cada cliente,
**Para** saber exatamente o que fazer para reter clientes em risco sem depender de intuicao.

---

## Objective

Implementar agente que usa GPT-4o para gerar diagnostico textual (3-4 paragrafos) e plano de acao (3-5 acoes concretas) baseado nos scores e detalhes dos outros 3 agentes. O diagnostico e especifico para cada cliente, mencionando dados concretos.

---

## Scope

### IN Scope

- [x] Prompt rico com contexto completo do cliente
- [x] Diagnostico textual (3-4 paragrafos, tom profissional)
- [x] Plano de acao (3-5 acoes priorizadas, comecando com verbo)
- [x] JSON response format (garante parsing confiavel)
- [x] Inclui dados financeiros, WhatsApp, NPS no prompt
- [x] Calculo de risco (baixo/medio/alto) no prompt
- [x] Custo e tokens rastreados

### OUT of Scope

- Execucao automatica das acoes (futuro)
- Notificacao por email do diagnostico (feito pelo orchestrator)
- Historico de diagnosticos (feito pela tabela health_scores)

---

## Acceptance Criteria

### 1. Prompt Rico e Contextualizado
- [x] Inclui dados do cliente: nome, segmento, servico, tempo de contrato, MRR
- [x] Inclui Health Score total e risco de churn
- [x] Inclui scores dos 4 pilares (ou "sem dados")
- [x] Inclui flags criticos consolidados
- [x] Inclui detalhes financeiros: cobrancas, atrasos, chargebacks, valores
- [x] Inclui detalhes de comunicacao: mensagens, sentimento, engajamento, resumo IA
- [x] Inclui detalhes NPS: media, ultimo score, respostas

### 2. Output Estruturado
- [x] `diagnosis`: texto de 3-4 paragrafos em portugues
- [x] `actionPlan`: array de 3-5 strings, cada uma comecando com verbo
- [x] `tokensUsed`: total de tokens consumidos
- [x] JSON valido (response_format: json_object)

### 3. Regras do Prompt
- [x] Diagnostico especifico para o cliente (nao generico)
- [x] Menciona dados concretos (scores, valores, dias)
- [x] Acoes praticas e priorizadas (mais urgente primeiro)
- [x] Cada acao comeca com verbo: "Ligar para...", "Negociar...", "Enviar..."
- [x] Nao usa termos tecnicos: "flags", "score" → linguagem natural
- [x] Tom profissional mas direto

### 4. Modelo e Configuracao
- [x] Modelo: GPT-4o (analise holistisca requer inteligencia superior)
- [x] Max tokens: 1200
- [x] Temperatura: 0.4 (equilibrio entre criatividade e consistencia)
- [x] Response format: json_object

---

## Technical Implementation

### Tipos

```typescript
interface DiagnosticoInput {
  clientName:     string
  agencyName:     string
  segment:        string | null
  serviceType:    string | null
  contractMonths: number
  mrrValue:       number | null
  scoreFinanceiro:  number | null
  scoreProximidade: number | null
  scoreResultado:   number | null
  scoreNps:         number | null
  scoreTotal:       number
  agents: {
    financeiro:  AgentResult
    proximidade: AgentResult
    resultado:   AgentResult
    nps:         AgentResult
  }
  openaiKey: string
}

interface DiagnosticoOutput {
  diagnosis:  string      // 3-5 paragrafos
  actionPlan: string[]    // 3-5 acoes
  tokensUsed: number
}
```

### Estrutura do Prompt

```
=== CLIENTE ===
Nome, Segmento, Servico, Tempo, Valor MRR

=== HEALTH SCORE ===
Score Total, Risco de Churn, Pilares (4x)
Flags criticos

=== DETALHES FINANCEIROS ===
Cobrancas, recebidas, atrasos, chargebacks, valor

=== DETALHES DE COMUNICACAO (WhatsApp) ===
Mensagens, sentimento, engajamento, resumo IA

=== DETALHES DE NPS/RESULTADO ===
NPS medio, ultimo NPS, respostas

REGRAS:
1. Diagnostico especifico, nao generico
2. Dados concretos no texto
3. 3-5 acoes praticas priorizadas
4. Cada acao comeca com verbo
5. Linguagem natural (sem termos tecnicos)
```

### Custo

| Modelo | Tokens (est.) | Custo |
|--------|---------------|-------|
| GPT-4o | ~800-1200 | ~$0.01-0.03 |

---

## File List

### Created Files
- [x] `src/lib/agents/diagnostico.ts` (6.693 bytes)

### Arquivos Relacionados
- `src/lib/agents/types.ts` — `calcChurnRisk()` usado no prompt
- `src/lib/agents/orchestrator.ts` — Chama o diagnostico apos calculo do score

---

## Exemplo de Output

### Cliente em risco medio
```json
{
  "diagnosis": "O cliente Acme Corp apresenta sinais moderados de atencao.
  Do ponto de vista financeiro, o cenario e estavel com 5 cobrancas
  recebidas no periodo, porem ha 1 cobranca em atraso ha 12 dias no
  valor de R$ 2.500,00, o que merece acompanhamento imediato.\n\n
  A comunicacao via WhatsApp mostra engajamento medio, com 45 mensagens
  trocadas nos ultimos 60 dias. O sentimento geral e neutro, sem sinais
  claros de insatisfacao, mas a frequencia de interacao caiu nas ultimas
  2 semanas.\n\n
  O NPS de 7 na ultima resposta coloca o cliente na zona neutra —
  satisfeito mas nao entusiasmado. Combinado com a queda de engajamento,
  sugere que o cliente pode estar perdendo percepcao de valor.\n\n
  O risco atual e MEDIO. Acoes preventivas agora podem evitar que evolua
  para alto.",

  "actionPlan": [
    "Ligar para o responsavel da Acme Corp para entender a cobranca em atraso e negociar condicoes de pagamento",
    "Agendar reuniao de alinhamento semanal para reforcar a percepcao de valor dos servicos entregues",
    "Enviar relatorio de resultados do ultimo mes destacando metricas positivas alcancadas",
    "Solicitar feedback direto sobre pontos de melhoria na prestacao de servico",
    "Preparar proposta de valor adicional ou ajuste contratual caso necessario"
  ],

  "tokensUsed": 987
}
```

---

## Decisoes Tecnicas

### 1. Por que GPT-4o e nao GPT-4o-mini?
- Diagnostico requer compreensao holistica de multiplos dados
- Plano de acao precisa ser acionavel e especifico
- GPT-4o e significativamente melhor em raciocinio complexo
- Custo aceitavel (~$0.02 por diagnostico)

### 2. Por que response_format: json_object?
- Garante JSON valido sempre (nao precisa regex/parsing manual)
- Elimina erros de parsing em producao
- Estrutura consistente para persistencia no banco

### 3. Por que temperatura 0.4?
- 0.0 seria muito repetitivo (diagnosticos identicos)
- 1.0 seria muito criativo (perde consistencia)
- 0.4 equilibra variabilidade com confiabilidade

---

## Quality Gates

- [x] TypeScript compila sem erros
- [x] Lint passa
- [x] JSON sempre valido (response_format)
- [x] Diagnostico especifico para cada cliente (nao generico)
- [x] Acoes comecam com verbo
- [x] Tokens rastreados para controle de custo
- [x] Error handling nao quebra orquestrador

---

## Dependencies

- Agente Financeiro (HS-1) executado com sucesso
- Agente NPS (HS-2) executado com sucesso
- Agente Proximidade (HS-3) executado com sucesso
- OpenAI API key configurada (obrigatoria para este agente)
- Funcao `calcChurnRisk()` de `types.ts`

---

**Story completed on:** Sprint 3
**Peso no Health Score:** Nao tem peso proprio (nao gera score numerico). Gera diagnostico textual e plano de acao.
**Retrospectiva:** Prompt rico com contexto completo e a chave para diagnosticos uteis. response_format: json_object eliminou 100% dos erros de parsing.
