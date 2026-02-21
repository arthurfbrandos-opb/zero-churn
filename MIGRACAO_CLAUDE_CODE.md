# 🔄 Migração: Pi Dev → Claude Code

**Data:** 21 de Fevereiro de 2026  
**Objetivo:** Transferir projeto Zero Churn do Pi para Claude Code  
**Motivo:** Claude Code tem suporte completo a AIOS-Core (hooks, lifecycle events)

---

## 📋 Índice

1. [Por Que Migrar?](#por-que-migrar)
2. [Diferenças Pi vs Claude Code](#diferenças-pi-vs-claude-code)
3. [Preparação do Ambiente](#preparação-do-ambiente)
4. [Setup Claude Code](#setup-claude-code)
5. [Ativação de Agentes AIOS](#ativação-de-agentes-aios)
6. [Workflow AIOS no Claude Code](#workflow-aios-no-claude-code)
7. [Checklist de Migração](#checklist-de-migração)
8. [Troubleshooting](#troubleshooting)

---

## 1. Por Que Migrar?

### **Limitações do Pi:**
- ❌ **Sem lifecycle hooks** (pre-tool, post-tool, session-start, session-end)
- ❌ **Sem eventos AIOS** (agent activation, workflow transitions)
- ❌ **Automação limitada** (context loading, quality gates)
- ❌ **Sem integração nativa** com `.claude/` configs

### **Vantagens do Claude Code:**

| Feature | Pi | Claude Code |
|---------|----|----|
| **Lifecycle Hooks** | ❌ | ✅ Completo |
| **Agent Activation** | Manual | ✅ Automático (`@agent`) |
| **Context Loading** | Manual | ✅ Automático (AIOS hooks) |
| **Quality Gates** | Manual | ✅ Automático (pre-push, pre-commit) |
| **Memory System** | ❌ | ✅ Agent memory (`MEMORY.md`) |
| **Workflow Engine** | ❌ | ✅ AIOS workflows |
| **Session Persistence** | ❌ | ✅ Session tracking |

**Resultado:** 🚀 **Produtividade 3-5x maior** com AIOS no Claude Code

---

## 2. Diferenças Pi vs Claude Code

### **2.1 Ativação de Agentes**

**Pi:**
```
# Manual - você precisa pedir explicitamente
"Você pode agir como @pm e criar um PRD?"
```

**Claude Code:**
```bash
# Automático - basta usar o comando
@pm

# Ou usar slash command
/pm

# Agente carrega automaticamente:
# - Persona (de .aios-core/development/agents/pm.md)
# - Commands (*create-prd, *create-epic, etc)
# - Context (projeto atual, docs, stories)
```

### **2.2 Comandos de Agentes**

**Pi:**
```
# Manual - você digita tudo
"Crie um PRD para a feature X com objetivos Y e Z"
```

**Claude Code:**
```bash
# Comandos estruturados
@pm *create-prd --feature="Sentiment Analysis"

# Ou interativo
@pm
*create-prd
# Agente pergunta o que precisa
```

### **2.3 Workflows**

**Pi:**
```
# Você orquestra manualmente
1. "Crie PRD" (você)
2. "Agora crie arquitetura" (você)
3. "Quebre em stories" (você)
```

**Claude Code:**
```bash
# Workflow automático
@pm *workflow greenfield-feature

# AIOS executa:
1. @analyst - Research
2. @pm - PRD
3. @architect - Architecture
4. @sm - Stories
5. @dev - Implementação
6. @qa - Validação
```

### **2.4 Context Loading**

**Pi:**
```
# Você precisa passar contexto manualmente
"Leia o arquivo STATUS_COMPLETO.md e baseie-se nele"
```

**Claude Code:**
```bash
# Context carregado automaticamente via hooks
@dev

# Hook carrega automaticamente:
# - .aios-core/constitution.md
# - docs/prd/*.md
# - docs/architecture/*.md
# - docs/stories/backlog.md
# - Story atual (se houver)
```

---

## 3. Preparação do Ambiente

### **3.1 Verificar Instalação AIOS**

```bash
cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn

# Verificar se AIOS está instalado
ls -la .aios-core/
ls -la .claude/

# Deve mostrar:
# .aios-core/ ✅
# .claude/ ✅
# AGENTS.md ✅
```

### **3.2 Verificar Node.js**

```bash
node --version
# Deve ser >= 18.0.0

npm --version
# Deve ser >= 9.0.0
```

### **3.3 Commit Atual**

```bash
git status
# Deve estar limpo (nothing to commit)

git log --oneline -1
# Deve mostrar: 5664ff7 docs: Retrospectiva AIOS completa
```

---

## 4. Setup Claude Code

### **4.1 Instalar Claude Code (Desktop App)**

**Download:**
- macOS: https://claude.ai/download
- Ou use Claude.ai web (limitações maiores)

**Verificar instalação:**
- Abrir Claude Code
- Fazer login com conta Anthropic
- Verificar se está funcionando

### **4.2 Abrir Projeto no Claude Code**

**Opção 1: Via Terminal**
```bash
cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
open -a "Claude" .
```

**Opção 2: Via Interface**
- Abrir Claude Code
- File → Open Folder
- Selecionar: `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn`

### **4.3 Verificar Configuração Claude**

Claude Code deve detectar automaticamente:

```
✅ .claude/CLAUDE.md (regras principais)
✅ .claude/agents/ (11 agentes)
✅ .claude/hooks/ (lifecycle hooks)
✅ .aios-core/ (framework)
✅ AGENTS.md (config de agentes)
```

**Teste inicial:**
```bash
# No chat do Claude Code, digitar:
@pm *help

# Deve retornar:
# 🎯 PM (Product Manager) - Kai
# Available commands:
# *create-prd - Create Product Requirements Document
# *create-epic - Create epic
# ...
```

---

## 5. Ativação de Agentes AIOS

### **5.1 Agentes Disponíveis**

| Agente | Comando | Quando Usar |
|--------|---------|-------------|
| **@analyst** | `@analyst` | Pesquisa, análise de mercado, brainstorming |
| **@pm** | `@pm` | Criar PRD, definir features, roadmap |
| **@architect** | `@architect` | Arquitetura técnica, decisões de design |
| **@sm** | `@sm` | Criar stories, planejar sprint, backlog |
| **@dev** | `@dev` | Implementar código, refatorar, debug |
| **@qa** | `@qa` | Code review, testes, validação |
| **@devops** | `@devops` | Deploy, CI/CD, git operations |
| **@po** | `@po` | Product Owner, visão de produto |
| **@data-engineer** | `@data-engineer` | Database, migrations, data pipelines |
| **@ux-expert** | `@ux-expert` | UX/UI design, wireframes |
| **@aios-master** | `@aios-master` | Orquestração, meta-comandos |

### **5.2 Ativando um Agente**

**Método 1: Comando direto**
```bash
@pm
```

**Método 2: Slash command**
```bash
/pm
```

**Método 3: Via AGENTS.md**
```bash
# Claude Code lê AGENTS.md automaticamente
# Basta usar o atalho configurado
```

**Resposta esperada:**
```
🎯 PM (Product Manager) - Kai

I'm your Product Manager. I help you:
- Create comprehensive PRDs
- Define product strategy
- Prioritize features
- Plan roadmap

Available commands:
*help - Show all commands
*create-prd - Create Product Requirements Document
*create-epic - Create epic
*prioritize - Prioritize backlog

Ready to build great products! What would you like to do?
```

### **5.3 Usando Comandos do Agente**

**Sintaxe:**
```bash
@agent *command --option=value
```

**Exemplos:**
```bash
# Criar PRD
@pm *create-prd --feature="Sentiment Analysis"

# Criar story
@sm *draft --epic="epic-whatsapp" --story="WPP-4"

# Implementar story
@dev *develop --story="WPP-4"

# Code review
@qa *review --story="WPP-4"

# Deploy
@devops *push
```

### **5.4 Sair de um Agente**

```bash
*exit

# Ou simplesmente ativar outro agente
@dev
```

---

## 6. Workflow AIOS no Claude Code

### **6.1 Workflow Completo: Nova Feature**

```bash
# 1. Pesquisa e Análise
@analyst
*research --topic="Sentiment Analysis WhatsApp"

# 2. Criar PRD
@pm
*create-prd --feature="Sentiment Analysis"
# Salva em: docs/prd/prd-sentiment-analysis.md

# 3. Arquitetura
@architect
*design --feature="Sentiment Analysis"
# Salva em: docs/architecture/architecture-sentiment.md

# 4. Criar Stories
@sm
*draft --epic="epic-whatsapp" --story="WPP-4"
# Salva em: docs/stories/epics/epic-whatsapp/story-wpp-4-sentiment.md

# 5. Implementar
@dev
*develop --story="WPP-4"
# Implementa código seguindo acceptance criteria

# 6. Revisar
@qa
*review --story="WPP-4"
# Valida qualidade, testes, lint

# 7. Deploy
@devops
*push
# Git push + deploy Vercel
```

### **6.2 Workflow Automático**

```bash
# Usar workflow engine do AIOS
@aios-master
*workflow greenfield-feature --name="Sentiment Analysis"

# AIOS executa todos os passos automaticamente:
# ✓ @analyst - Research
# ✓ @pm - PRD
# ✓ @architect - Architecture
# ✓ @sm - Stories
# ✓ @dev - Implementation
# ✓ @qa - Review
# ✓ @devops - Deploy
```

### **6.3 Retrospectiva (continuar)**

```bash
# Documentar Epic Health Score
@sm
*retrospective --epic="epic-health-score"

# Criar stories retrospectivas
*draft --story="HS-1" --title="Financial Agent" --status="done"
*draft --story="HS-2" --title="NPS Agent" --status="done"
*draft --story="HS-3" --title="Proximity Agent" --status="done"
*draft --story="HS-4" --title="Diagnostic Agent" --status="done"
*draft --story="HS-5" --title="Orchestrator" --status="done"
```

---

## 7. Checklist de Migração

### **Antes de Migrar:**

- [x] ✅ AIOS instalado (`.aios-core/`, `.claude/`)
- [x] ✅ Documentação criada (PRD, Architecture, Stories)
- [x] ✅ Git commit atualizado (`5664ff7`)
- [x] ✅ Migration 017 criada (whatsapp_group_id)
- [ ] ⏳ Migration 017 aplicada no Supabase
- [ ] ⏳ Código buildando sem erros
- [ ] ⏳ Testes passando (se houver)

### **Instalação Claude Code:**

- [ ] Claude Code instalado (desktop app)
- [ ] Projeto aberto no Claude Code
- [ ] `.claude/` detectado
- [ ] `.aios-core/` detectado
- [ ] AGENTS.md detectado

### **Teste de Agentes:**

- [ ] `@pm *help` funciona
- [ ] `@sm *help` funciona
- [ ] `@dev *help` funciona
- [ ] `@qa *help` funciona
- [ ] `@architect *help` funciona

### **Teste de Workflow:**

- [ ] Criar PRD de teste
- [ ] Criar story de teste
- [ ] Validar que arquivos são salvos corretamente
- [ ] Validar que hooks funcionam

### **Configuração Adicional:**

- [ ] Configurar Git user no Claude Code
- [ ] Configurar API keys (se necessário)
- [ ] Configurar Supabase local (se necessário)

---

## 8. Troubleshooting

### **8.1 Agentes Não Aparecem**

**Problema:**
```
@pm
# Não retorna greeting do agente
```

**Solução:**
```bash
# 1. Verificar se AGENTS.md existe
ls -la AGENTS.md

# 2. Verificar se .aios-core/development/agents/ existe
ls -la .aios-core/development/agents/

# 3. Reabrir Claude Code
# File → Reopen Project

# 4. Verificar logs
# Claude Code → View → Developer Tools → Console
```

### **8.2 Hooks Não Funcionam**

**Problema:**
```
# Hooks de pre-commit, pre-push não executam
```

**Solução:**
```bash
# 1. Verificar se .claude/hooks/ existe
ls -la .claude/hooks/

# 2. Verificar permissões
chmod +x .claude/hooks/*.sh
chmod +x .claude/hooks/*.py

# 3. Verificar settings.local.json
cat .claude/settings.local.json

# 4. Reinstalar hooks
cd .claude/hooks
./install-hooks.sh
```

### **8.3 Comandos Não Funcionam**

**Problema:**
```
@pm *create-prd
# Não executa o comando
```

**Solução:**
```bash
# 1. Verificar sintaxe
# Correto: @pm (ativa agente)
# Depois: *create-prd (executa comando)

# 2. Verificar se agente está ativo
# Deve mostrar greeting antes de aceitar comandos

# 3. Usar *help para ver comandos disponíveis
@pm
*help
```

### **8.4 Context Não Carrega**

**Problema:**
```
# Agente não tem contexto do projeto
```

**Solução:**
```bash
# 1. Verificar estrutura de docs/
ls -la docs/prd/
ls -la docs/architecture/
ls -la docs/stories/

# 2. Force reload
@aios-master
*reload-context

# 3. Verificar hooks
cat .claude/hooks/user_prompt_submit.py
```

---

## 9. Próximos Passos no Claude Code

### **Passo 1: Familiarização (30 min)**

```bash
# Testar cada agente
@analyst *help
@pm *help
@architect *help
@sm *help
@dev *help
@qa *help
@devops *help

# Testar comandos básicos
@pm *create-prd --feature="Test"
@sm *draft --story="TEST-1" --title="Test Story"
```

### **Passo 2: Completar Retrospectiva (2-3h)**

```bash
# Documentar Epic Health Score
@sm
*retrospective --epic="epic-health-score"

# Criar 5 stories do Health Score
@sm
*draft --story="HS-1" --title="Financial Agent" --status="done"
*draft --story="HS-2" --title="NPS Agent" --status="done"
*draft --story="HS-3" --title="Proximity Agent" --status="done"
*draft --story="HS-4" --title="Diagnostic Agent" --status="done"
*draft --story="HS-5" --title="Orchestrator" --status="done"
```

### **Passo 3: Próxima Feature com AIOS (4-6h)**

```bash
# Usar workflow completo para WPP-4
@pm
*create-prd --feature="Sentiment Analysis"

@architect
*design --feature="Sentiment Analysis"

@sm
*draft --story="WPP-4" --epic="epic-whatsapp"

@dev
*develop --story="WPP-4"

@qa
*review --story="WPP-4"

@devops
*push
```

### **Passo 4: Automatizar com Workflows**

```bash
# Usar workflow engine
@aios-master
*workflow list

*workflow greenfield-feature --name="Formulários Dinâmicos"
```

---

## 10. Recursos Adicionais

### **Documentação AIOS:**
- `.aios-core/README.md` - Overview do framework
- `.aios-core/constitution.md` - Princípios fundamentais
- `docs/guides/user-guide.md` - Guia completo do usuário
- `AIOS_ANALYSIS.md` - Análise detalhada do AIOS

### **Documentação do Projeto:**
- `docs/prd/prd-zero-churn-v1.md` - Product Requirements
- `docs/architecture/architecture-overview.md` - Arquitetura
- `docs/stories/README.md` - Guia de stories
- `STATUS_COMPLETO.md` - Status atual

### **Configuração:**
- `.claude/CLAUDE.md` - Regras do Claude Code
- `AGENTS.md` - Config de agentes
- `.aios-core/core-config.yaml` - Config do framework

### **Suporte:**
- GitHub AIOS: https://github.com/SynkraAI/aios-core
- Docs AIOS: https://synkra.ai
- Issues: https://github.com/SynkraAI/aios-core/issues

---

## 11. Resumo

### **O que você ganha com Claude Code + AIOS:**

1. ✅ **Agentes especializados** ativados com `@agent`
2. ✅ **Comandos estruturados** com `*command`
3. ✅ **Workflows automáticos** (end-to-end)
4. ✅ **Context loading automático** (hooks)
5. ✅ **Quality gates** (pre-commit, pre-push)
6. ✅ **Memory system** (agentes lembram contexto)
7. ✅ **Produtividade 3-5x maior**

### **Workflow Típico:**

```
ANTES (Pi):
1. "Crie um PRD para X" (manual)
2. "Agora arquitetura" (manual)
3. "Quebre em stories" (manual)
4. "Implemente story Y" (manual)
5. "Revise código" (manual)
= 5 interações manuais

DEPOIS (Claude Code + AIOS):
@aios-master *workflow greenfield-feature --name="X"
= 1 comando, tudo automático ✅
```

---

## ✅ Checklist Final

Antes de começar no Claude Code:

- [x] ✅ AIOS instalado
- [x] ✅ Documentação criada (PRD, Architecture, Stories)
- [x] ✅ Git atualizado (commit `5664ff7`)
- [ ] ⏳ Claude Code instalado
- [ ] ⏳ Projeto aberto no Claude Code
- [ ] ⏳ Agentes testados
- [ ] ⏳ Workflow testado
- [ ] ⏳ Pronto para usar!

---

**Última atualização:** 21 de Fevereiro de 2026  
**Próximo passo:** Instalar Claude Code e testar `@pm *help`

---

**AIOS está pronto! Hora de decolar com Claude Code! 🚀**
