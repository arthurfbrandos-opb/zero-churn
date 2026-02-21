# 📚 Stories - Zero Churn

Este diretório contém todas as histórias de desenvolvimento do projeto Zero Churn, organizadas por épicos seguindo a metodologia AIOS.

---

## 📂 Estrutura

```
stories/
├── README.md                 # Este arquivo
├── backlog.md               # Backlog geral de stories
├── epics/                   # Épicos organizados
│   ├── epic-whatsapp/       # WhatsApp Integration
│   ├── epic-health-score/   # Health Score Analysis
│   ├── epic-forms/          # Forms & Onboarding
│   └── epic-dashboard/      # Dashboard & Metrics
└── done/                    # Stories concluídas (arquivo)
    └── 2026-02-stories.md
```

---

## 🎯 Épicos Ativos

### **1. Epic WhatsApp** (`epic-whatsapp/`)
**Status:** 🟢 Em andamento  
**Objetivo:** Integração completa com Evolution API

**Stories:**
- ✅ `story-wpp-1-agency-connection.md` - Conexão por agência
- ✅ `story-wpp-2-group-selection.md` - Seleção de grupo
- ✅ `story-wpp-3-migration-017.md` - Fix campo whatsapp_group_id
- ⏳ `story-wpp-4-sentiment-analysis.md` - Análise de sentimento (Next)

### **2. Epic Health Score** (`epic-health-score/`)
**Status:** ✅ Concluido (5/5 stories)
**Objetivo:** Motor de IA preditiva com 4 agentes + orquestrador

**Stories:**
- ✅ `story-hs-1-financial-agent.md` - Agente Financeiro (35%)
- ✅ `story-hs-2-nps-agent.md` - Agente NPS + Resultado (25% + 10%)
- ✅ `story-hs-3-proximity-agent.md` - Agente Proximidade (30%)
- ✅ `story-hs-4-diagnostic-agent.md` - Agente Diagnostico (GPT-4o)
- ✅ `story-hs-5-orchestrator.md` - Orquestrador de Analise

### **3. Epic Forms** (`epic-forms/`)
**Status:** 🟡 Planejado  
**Objetivo:** Formulários de onboarding e qualificação

**Stories:**
- ⏳ Definir stories com @pm

### **4. Epic Dashboard** (`epic-dashboard/`)
**Status:** 🟡 Planejado  
**Objetivo:** Dashboard executivo e métricas

**Stories:**
- ⏳ Definir stories com @pm

---

## 📝 Como Criar uma Nova Story

### **1. Escolha o Épico:**
```bash
cd docs/stories/epics/epic-<nome>/
```

### **2. Use o Template:**
Copie de `.aios-core/development/templates/story-template.md`

### **3. Estrutura Obrigatória:**
```markdown
# Story XXX-N: Nome da Feature

**Epic:** Nome do Épico
**Story ID:** XXX-N
**Priority:** High/Medium/Low
**Points:** 1-13 (Fibonacci)
**Status:** Draft/Ready/In Progress/Done
**Lead:** @dev/@qa/@architect

## User Story
Como [persona]
Quero [objetivo]
Para [benefício]

## Acceptance Criteria
1. [ ] Critério 1
2. [ ] Critério 2

## File List
- [ ] arquivo1.ts (pending)
- [x] arquivo2.ts (created)

## Technical Notes
[Orientação para implementação]
```

---

## 🔄 Workflow AIOS

```
@pm cria PRD
   ↓
@architect define arquitetura
   ↓
@sm cria story detalhada
   ↓
@dev implementa
   ↓
@qa valida
   ↓
@devops push
```

---

## 📊 Status dos Épicos

| Épico | Stories Total | Concluídas | Em Progresso | Planejadas |
|-------|--------------|------------|--------------|------------|
| WhatsApp | 4 | 3 | 0 | 1 |
| Health Score | 5 | 5 | 0 | 0 |
| Forms | - | 0 | 0 | - |
| Dashboard | - | 0 | 0 | - |

---

## 🎯 Próximos Passos

1. **Documentar Retrospectivamente:**
   - Criar stories para features já implementadas
   - Marcar como ✅ Done
   - Mover para `done/2026-02-stories.md`

2. **Planejar Próximos Épicos:**
   - Usar @pm para criar PRD de cada épico
   - Usar @architect para definir arquitetura
   - Usar @sm para quebrar em stories

3. **Workflow de Desenvolvimento:**
   - Toda nova feature começa com uma story
   - Story passa por review antes de implementação
   - Checklist atualizado durante desenvolvimento

---

**Ultima atualizacao:** 21 Fevereiro 2026
**Metodologia:** AIOS Story-Driven Development
