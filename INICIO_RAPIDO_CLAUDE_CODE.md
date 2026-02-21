# 🚀 INÍCIO RÁPIDO - Claude Code (Conversa Natural)

**Problema:** Comandos @aios-master não funcionam como esperado  
**Solução:** Conversar naturalmente com Claude Code

---

## ✅ **MÉTODO SIMPLES (FUNCIONA 100%)**

### **1. Abrir Claude Code**

- Abrir Claude Code (desktop app ou web)
- File → Open Folder
- Selecionar: `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn`

### **2. No Chat, COPIAR e COLAR Exatamente Isto:**

```
Olá! Preciso que você me ajude com o projeto Zero Churn.

CONTEXTO DO PROJETO:
Leia os seguintes arquivos para entender o projeto:
1. SESSAO_21_FEV_2026_RESUMO.md
2. docs/prd/prd-zero-churn-v1.md
3. docs/architecture/architecture-overview.md
4. docs/stories/README.md
5. RETROSPECTIVA_AIOS.md

Depois de ler, me diga:
- O que é o Zero Churn?
- Qual o status atual do projeto?
- Quais são os próximos passos?

Estou usando metodologia AIOS para desenvolvimento.
```

### **3. Aguardar Resposta**

Claude vai:
- ✅ Ler todos os arquivos
- ✅ Entender o projeto completo
- ✅ Te dar um resumo
- ✅ Sugerir próximos passos

### **4. Depois da Resposta, Pedir Algo Específico:**

**Opção A: Documentar Epic Health Score**

```
Perfeito! Agora preciso que você atue como Scrum Master e documente 
retrospectivamente o Epic Health Score.

CONTEXTO:
Já implementamos 4 agentes de IA para calcular Health Score:
1. Financial Agent (src/lib/agents/financial.ts)
2. NPS Agent (src/lib/agents/nps.ts)
3. Proximity Agent (src/lib/agents/proximity.ts)
4. Diagnostic Agent (src/lib/agents/diagnostic.ts)
5. Orchestrator (src/lib/agents/orchestrate-analysis.ts)

TAREFA:
Crie a documentação retrospectiva seguindo o padrão das stories em 
docs/stories/epics/epic-whatsapp/

Crie:
1. docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md
2. docs/stories/epics/epic-health-score/story-hs-1-financial-agent.md (Done)
3. docs/stories/epics/epic-health-score/story-hs-2-nps-agent.md (Done)
4. docs/stories/epics/epic-health-score/story-hs-3-proximity-agent.md (Done)
5. docs/stories/epics/epic-health-score/story-hs-4-diagnostic-agent.md (Done)
6. docs/stories/epics/epic-health-score/story-hs-5-orchestrator.md (Done)

Use como referência o formato de:
- docs/stories/epics/epic-whatsapp/EPIC-WPP-INDEX.md
- docs/stories/epics/epic-whatsapp/story-wpp-1-agency-connection.md

Todas as stories devem estar marcadas como "Done" pois já estão implementadas.
```

**Opção B: Planejar WPP-4 Sentiment Analysis**

```
Perfeito! Agora preciso que você atue como Product Manager e crie 
o PRD para a próxima feature.

FEATURE: WPP-4 - Análise de Sentimento em Mensagens WhatsApp

CONTEXTO:
- Já temos WhatsApp Integration funcionando (epic-whatsapp)
- Já temos Proximity Agent que usa GPT-4o-mini
- Precisamos implementar análise automática de sentimento

REQUISITOS:
- Analisar últimas 100 mensagens do grupo WhatsApp vinculado ao cliente
- Usar GPT-4o-mini (já configurado no projeto)
- Gerar score de 0-100 baseado em sentimento
- Detectar flags: negative_sentiment, decreasing_engagement, no_messages
- Rodar via cron job semanal (já temos 5 crons configurados)

TAREFA:
Crie o PRD completo em docs/prd/prd-sentiment-analysis.md seguindo 
o mesmo formato de docs/prd/prd-zero-churn-v1.md

Inclua:
1. Visão geral
2. Problema e oportunidade
3. Objetivos
4. Requisitos funcionais
5. Requisitos não-funcionais
6. Arquitetura sugerida
7. Acceptance criteria
```

---

## 🎯 **PRÓXIMOS PASSOS DEPOIS:**

### **Quando Claude Terminar a Primeira Tarefa:**

```
Ótimo trabalho! Agora crie os arquivos.

Para cada arquivo, use o comando:
/write <caminho_do_arquivo>

Exemplo:
/write docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md

Comece criando todos os arquivos agora.
```

---

## 💬 **EXEMPLO COMPLETO DE CONVERSA:**

**Você:**
```
Olá! Leia estes arquivos para entender o projeto Zero Churn:
1. SESSAO_21_FEV_2026_RESUMO.md
2. docs/prd/prd-zero-churn-v1.md
3. docs/architecture/architecture-overview.md

Depois me diga o que é o projeto e qual o status atual.
```

**Claude:**
```
Entendi! Zero Churn é um sistema SaaS de gestão preditiva de churn 
para agências...

Status Atual:
- MVP 90% implementado
- WhatsApp Integration ✅
- Health Score (4 agentes) ✅
- Próximos passos: Documentar Epic Health Score

Posso te ajudar com:
1. Documentação retrospectiva
2. Planejamento de novas features
3. Implementação de código
```

**Você:**
```
Perfeito! Atue como Scrum Master e crie a documentação retrospectiva 
do Epic Health Score. Crie 6 arquivos (1 epic index + 5 stories) 
em docs/stories/epics/epic-health-score/ seguindo o padrão de 
epic-whatsapp. Todas as stories marcadas como Done.
```

**Claude:**
```
Vou criar a documentação! Aqui está o EPIC-HS-INDEX.md:

# Epic Health Score...

[conteúdo completo]

Quer que eu crie os outros 5 arquivos agora?
```

**Você:**
```
Sim! Crie todos usando /write
```

**Claude:**
```
/write docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md
/write docs/stories/epics/epic-health-score/story-hs-1-financial-agent.md
...
```

---

## ✅ **VANTAGENS DESTA ABORDAGEM:**

1. ✅ **Funciona sempre** (não depende de comandos especiais)
2. ✅ **Natural** (você conversa normalmente)
3. ✅ **Flexível** (você explica o que quer)
4. ✅ **Completo** (Claude lê toda documentação)
5. ✅ **Rápido** (sem configuração complexa)

---

## 🎯 **TEMPLATE PARA COMEÇAR:**

**COPIE E COLE ISTO NO CLAUDE CODE:**

```
Olá! Sou Arthur e estou trabalhando no projeto Zero Churn.

TAREFA INICIAL:
Leia os seguintes arquivos para entender o contexto completo:
1. SESSAO_21_FEV_2026_RESUMO.md (resumo da última sessão)
2. docs/prd/prd-zero-churn-v1.md (Product Requirements)
3. docs/architecture/architecture-overview.md (Arquitetura técnica)
4. docs/stories/README.md (Guia de stories)
5. RETROSPECTIVA_AIOS.md (Retrospectiva AIOS)

Depois de ler, me confirme que entendeu o projeto respondendo:
1. O que é o Zero Churn?
2. Qual stack tecnológica?
3. Qual o status atual (% implementado)?
4. Quantas stories temos (done vs pending)?
5. Qual o próximo passo prioritário?

Aguardo sua confirmação para darmos sequência.
```

---

## 🚨 **SE AINDA DER PROBLEMA:**

### **Alternativa: Perguntar Diretamente**

```
Me ajude a documentar o projeto Zero Churn usando metodologia AIOS.

O projeto é um SaaS de gestão preditiva de churn para agências.
Stack: Next.js 15, Supabase, Vercel, OpenAI.
Status: MVP 90% implementado.

Já temos documentação em:
- docs/prd/prd-zero-churn-v1.md
- docs/architecture/architecture-overview.md
- docs/stories/epics/epic-whatsapp/ (3 stories done)

Preciso documentar Epic Health Score (4 agentes + orchestrator).

Você pode me ajudar criando a estrutura de documentação?
```

---

## 📊 **RESUMÃO:**

**NÃO USAR:**
```
@aios-master     ❌ (pode não funcionar)
*context         ❌ (pode dar erro)
*status          ❌ (pode não responder)
```

**USAR:**
```
"Leia estes arquivos: ..."                    ✅ FUNCIONA
"Atue como Scrum Master e crie..."           ✅ FUNCIONA
"Preciso que você me ajude com..."           ✅ FUNCIONA
"Crie documentação seguindo padrão de..."    ✅ FUNCIONA
```

---

## 🎯 **PRÓXIMOS 10 MINUTOS:**

**1. Min 0-2:** Copiar o template acima
**2. Min 2-5:** Colar no Claude Code e aguardar resposta
**3. Min 5-10:** Pedir criação da documentação Epic Health Score

**Resultado:**
- ✅ Claude entende projeto 100%
- ✅ Epic Health Score documentado
- ✅ 6 arquivos criados
- ✅ Pronto para próxima feature!

---

**FUNCIONA 100%! É SÓ CONVERSAR NATURALMENTE!** 🎯
