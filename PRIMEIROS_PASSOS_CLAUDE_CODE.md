# 🎯 Primeiros Passos no Claude Code - AIOS Master

**Objetivo:** Ativar AIOS Master e fazer onboarding do projeto Zero Churn

---

## 📋 Checklist Pré-Requisitos

Antes de começar, certifique-se:

- [x] ✅ Migration 017 rodada no Supabase
- [ ] ⏳ Claude Code instalado (Desktop App)
- [ ] ⏳ Projeto aberto no Claude Code
- [ ] ⏳ AIOS detectado
- [ ] ⏳ Agentes ativados

---

## 🔧 PASSO 1: Instalar Claude Code

### **Opção A: Desktop App (Recomendado)**

**macOS:**
```bash
# Download direto
open https://claude.ai/download

# Ou via Homebrew (se tiver)
brew install --cask claude
```

**Instalação:**
1. Baixar o instalador
2. Arrastar Claude.app para /Applications
3. Abrir Claude.app
4. Fazer login com conta Anthropic

### **Opção B: Web (Limitações)**

```bash
# Apenas se desktop app não funcionar
open https://claude.ai
```

⚠️ **Nota:** Web tem limitações (sem hooks, sem context automático)

---

## 📂 PASSO 2: Abrir Projeto no Claude Code

### **Método 1: Via Terminal**

```bash
cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn

# Abrir com Claude Code
open -a "Claude" .
```

### **Método 2: Via Interface**

1. Abrir Claude Code
2. **Cmd + O** (ou File → Open Folder)
3. Navegar até: `/Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn`
4. Clicar **Open**

### **Verificar se Abriu Corretamente:**

No Claude Code, você deve ver:
```
📁 zero-churn
  ├── .aios-core/       ✅
  ├── .claude/          ✅
  ├── docs/             ✅
  ├── src/              ✅
  ├── AGENTS.md         ✅
  └── ...
```

---

## 🔍 PASSO 3: Verificar Detecção do AIOS

### **No Chat do Claude Code, digitar:**

```bash
@aios-master
```

### **Resposta Esperada:**

Se AIOS foi detectado corretamente, você verá:

```
🎯 AIOS Master (Pax) - Framework Orchestrator

I'm the AIOS Master Agent, responsible for orchestrating the entire 
AIOS framework across your project.

I can help you with:
- 🔄 Workflow orchestration
- 📊 Project analysis
- 🧭 Agent navigation
- 📋 Status reports
- 🎯 Meta-commands

Available commands:
*help - Show all commands
*status - Project status overview
*agents - List available agents
*workflow - Execute workflows
*context - Load project context

What would you like to do?
```

### **Se NÃO Aparecer:**

Tente esses passos:

1. **Verificar AGENTS.md:**
```bash
cat AGENTS.md | grep aios-master
# Deve retornar algo
```

2. **Recarregar Projeto:**
- Fechar Claude Code
- Reabrir
- Tentar novamente `@aios-master`

3. **Verificar .aios-core/:**
```bash
ls -la .aios-core/development/agents/ | grep aios-master
# Deve mostrar: aios-master.md
```

---

## 🎯 PASSO 4: Onboarding do Projeto com AIOS Master

Agora vamos fazer o AIOS entender todo o seu projeto!

### **4.1 Ativar AIOS Master**

```bash
@aios-master
```

### **4.2 Carregar Contexto do Projeto**

```bash
*context
```

**O que acontece:**
- AIOS Master carrega automaticamente:
  - ✅ `docs/prd/prd-zero-churn-v1.md`
  - ✅ `docs/architecture/architecture-overview.md`
  - ✅ `docs/stories/README.md`
  - ✅ `.aios-core/constitution.md`
  - ✅ `STATUS_COMPLETO.md`
  - ✅ `package.json`

**Resposta esperada:**
```
✅ Context loaded successfully!

Project: Zero Churn
Type: Brownfield (existing codebase)
Status: MVP Functional (90% implemented)

Key Documents:
- PRD: docs/prd/prd-zero-churn-v1.md ✅
- Architecture: docs/architecture/architecture-overview.md ✅
- Stories: 3 done, 31 pending
- Epics: 4 (WhatsApp ✅, Health Score, Forms, Dashboard)

Stack:
- Next.js 15 + TypeScript
- Supabase (PostgreSQL + Auth)
- Vercel (Serverless)
- OpenAI (GPT-4o-mini)
- Evolution API (WhatsApp)

Ready to work! What's our next move?
```

### **4.3 Ver Status Geral**

```bash
*status
```

**Resposta esperada:**
```
📊 Zero Churn - Project Status

🎯 MVP Status: 90% Complete

✅ Implemented:
- WhatsApp Integration (1 instance per agency)
- Health Score (4 agents + orchestrator)
- NPS Forms (public form + reminders)
- Financial Module (Asaas + Dom)
- Dashboard (basic)
- 5 Cron Jobs

⏳ In Progress:
- Migration 017 (applied ✅)
- WhatsApp group selection testing

📋 Next Stories:
1. WPP-4: Sentiment Analysis (next)
2. Epic Health Score: Documentation (31 stories)
3. Epic Forms: Planning needed
4. Epic Dashboard: Planning needed

🐛 Known Issues:
- None critical

📈 Metrics:
- 17 migrations
- 40+ API endpoints
- ~25,000 lines of code
- ~180 files

Ready for next feature!
```

### **4.4 Listar Agentes Disponíveis**

```bash
*agents
```

**Resposta esperada:**
```
🤖 Available AIOS Agents:

Planning & Strategy:
- @analyst (Zara) - Research & analysis
- @pm (Kai) - Product management
- @po (Nova) - Product ownership

Architecture & Design:
- @architect (Aria) - Technical architecture
- @ux-expert (Uma) - UX/UI design

Development:
- @sm (River) - Scrum Master (stories)
- @dev (Dex) - Code implementation
- @data-engineer (Dara) - Data & database
- @devops (Felix) - CI/CD & deployment

Quality:
- @qa (Quinn) - Quality assurance

Meta:
- @aios-master (Pax) - Orchestration ← YOU ARE HERE

Use @agent to activate any agent.
```

---

## 🧪 PASSO 5: Testar Agentes Principais

Vamos testar se os agentes estão funcionando!

### **5.1 Testar @pm (Product Manager)**

```bash
@pm
```

**Resposta esperada:**
```
🎯 PM (Product Manager) - Kai

I help you define what to build and why.

Available commands:
*help - Show all commands
*create-prd - Create Product Requirements
*create-epic - Create epic
*prioritize - Prioritize backlog

Ready to build great products!
```

**Testar comando:**
```bash
*help
```

### **5.2 Testar @sm (Scrum Master)**

```bash
@sm
```

**Resposta esperada:**
```
🎯 Scrum Master - River

I help you break down work into actionable stories.

Available commands:
*help - Show all commands
*draft - Create new story
*retrospective - Document completed work
*plan-sprint - Plan sprint

Ready to organize your backlog!
```

### **5.3 Testar @dev (Developer)**

```bash
@dev
```

**Resposta esperada:**
```
🎯 Developer - Dex

I implement features based on stories.

Available commands:
*help - Show all commands
*develop - Implement story
*refactor - Improve code
*debug - Fix issues

Ready to code!
```

### **5.4 Testar @qa (Quality Assurance)**

```bash
@qa
```

**Resposta esperada:**
```
🎯 QA - Quinn

I ensure quality through reviews and tests.

Available commands:
*help - Show all commands
*review - Code review
*test - Run tests
*validate - Validate implementation

Ready to ensure quality!
```

---

## ✅ PASSO 6: Primeiro Comando Real

Agora que tudo está funcionando, vamos fazer algo útil!

### **Opção A: Completar Retrospectiva (Epic Health Score)**

```bash
@sm

# Documentar Epic Health Score
*retrospective --epic="epic-health-score"
```

**O que vai acontecer:**
1. AIOS vai analisar o código existente
2. Identificar features implementadas (4 agentes + orchestrator)
3. Criar stories retrospectivas em `docs/stories/epics/epic-health-score/`
4. Marcar tudo como "Done"

### **Opção B: Planejar Próxima Feature (WPP-4 Sentiment)**

```bash
@pm

# Criar PRD para Sentiment Analysis
*create-prd --feature="WhatsApp Sentiment Analysis"
```

**O que vai acontecer:**
1. AIOS vai criar `docs/prd/prd-sentiment-analysis.md`
2. Com base no contexto do projeto
3. Seguindo template AIOS
4. Já alinhado com arquitetura existente

### **Opção C: Ver Próximos Passos**

```bash
@aios-master

*next
```

**Resposta esperada:**
```
🎯 Next Recommended Actions:

Priority 1 (High Impact):
1. Document Epic Health Score (5 stories)
   - Preserve knowledge of implemented features
   - Estimated: 2-3h with @sm
   
2. Implement WPP-4: Sentiment Analysis
   - Complete WhatsApp epic
   - High business value
   - Estimated: 4-6h with full workflow

Priority 2 (Medium Impact):
3. Plan Epic Forms (NPS improvements)
   - Define stories with @sm
   - Estimated: 1-2h

4. Plan Epic Dashboard (analytics)
   - Define stories with @sm
   - Estimated: 1-2h

Recommended: Start with #1 (Documentation)
This preserves knowledge and validates AIOS workflow.

What would you like to do?
```

---

## 🎯 PASSO 7: Workflow Completo (Exemplo)

Vamos fazer um exemplo completo de como trabalhar com AIOS!

### **Cenário: Documentar Epic Health Score**

```bash
# 1. Ativar Scrum Master
@sm

# 2. Pedir retrospectiva
Eu: "Preciso documentar o Epic Health Score. Temos 4 agentes de IA implementados 
(Financial, NPS, Proximity, Diagnostic) mais o Orchestrator. Crie stories 
retrospectivas marcadas como Done."

# 3. AIOS vai:
# - Analisar código em src/lib/agents/
# - Ler PRD e Architecture
# - Criar EPIC-HS-INDEX.md
# - Criar 5 stories (HS-1 a HS-5)
# - Marcar todas como Done
# - Documentar acceptance criteria
# - Listar arquivos implementados

# 4. Resultado:
# docs/stories/epics/epic-health-score/
#   ├── EPIC-HS-INDEX.md
#   ├── story-hs-1-financial-agent.md ✅ Done
#   ├── story-hs-2-nps-agent.md ✅ Done
#   ├── story-hs-3-proximity-agent.md ✅ Done
#   ├── story-hs-4-diagnostic-agent.md ✅ Done
#   └── story-hs-5-orchestrator.md ✅ Done
```

---

## 📊 PASSO 8: Monitorar Progresso

### **Ver Status a Qualquer Momento:**

```bash
@aios-master
*status
```

### **Ver Backlog:**

```bash
@sm
*backlog
```

### **Ver Próximo Item:**

```bash
@aios-master
*next
```

---

## 🔄 PASSO 9: Workflow Automático (Avançado)

Quando estiver confortável, você pode usar workflows automáticos!

### **Exemplo: Feature Completa (Planning → Dev → QA → Deploy)**

```bash
@aios-master

*workflow greenfield-feature --name="Sentiment Analysis"
```

**O que acontece (automático):**
1. ✅ @analyst - Pesquisa sobre sentiment analysis
2. ✅ @pm - Cria PRD detalhado
3. ✅ @architect - Define arquitetura
4. ✅ @sm - Cria stories (WPP-4)
5. ✅ @dev - Implementa código
6. ✅ @qa - Valida qualidade
7. ✅ @devops - Faz deploy

**Tempo:** 30min-2h (vs 1 semana manual)

---

## 🎓 PASSO 10: Aprender Mais

### **Comandos Úteis:**

```bash
# Ver ajuda de qualquer agente
@agent *help

# Ver documentação AIOS
@aios-master
*docs

# Ver constituição (princípios)
@aios-master
*constitution

# Ver templates disponíveis
@aios-master
*templates

# Ver workflows disponíveis
@aios-master
*workflows
```

### **Dicas:**

1. **Sempre começar com AIOS Master:**
   - Ele te guia para o agente certo
   - Carrega contexto automaticamente

2. **Usar comandos estruturados:**
   - `@agent` ativa agente
   - `*command` executa comando
   - `*exit` sai do agente

3. **Deixar AIOS te guiar:**
   - Ele conhece o workflow
   - Ele conhece os princípios (constitution)
   - Ele sabe o que fazer

4. **Documentar sempre:**
   - Toda feature = story
   - Story-driven development
   - Preserva conhecimento

---

## ✅ CHECKLIST FINAL

Você está pronto quando:

- [ ] Claude Code instalado e aberto
- [ ] Projeto Zero Churn aberto no Claude Code
- [ ] `@aios-master` funciona (greeting aparece)
- [ ] `*context` carregou projeto
- [ ] `*status` mostra overview
- [ ] `*agents` lista 11 agentes
- [ ] `@pm *help` funciona
- [ ] `@sm *help` funciona
- [ ] `@dev *help` funciona
- [ ] Primeiro comando real executado (retrospectiva ou planning)

---

## 🚨 Troubleshooting

### **Problema 1: AIOS Master não responde**

**Sintomas:**
```bash
@aios-master
# Nada acontece
```

**Solução:**
1. Verificar se projeto está aberto:
   ```bash
   # No chat do Claude Code
   Listar arquivos do projeto
   ```

2. Verificar AGENTS.md:
   ```bash
   # No chat
   Ler o arquivo AGENTS.md
   ```

3. Reabrir Claude Code:
   - Cmd + Q (fechar)
   - Reabrir
   - File → Open Recent → zero-churn

### **Problema 2: Comandos não funcionam**

**Sintomas:**
```bash
@pm
*create-prd
# Erro ou não executa
```

**Solução:**
1. Ativar agente primeiro:
   ```bash
   @pm
   # Esperar greeting
   # DEPOIS executar comando
   *create-prd
   ```

2. Usar sintaxe correta:
   ```bash
   # CORRETO:
   @pm
   *create-prd --feature="X"

   # ERRADO:
   @pm *create-prd
   ```

### **Problema 3: Context não carrega**

**Sintomas:**
```bash
@aios-master
*context
# Erro: Cannot find docs/
```

**Solução:**
1. Verificar estrutura:
   ```bash
   ls -la docs/prd/
   ls -la docs/architecture/
   ls -la docs/stories/
   ```

2. Navegar para raiz do projeto:
   ```bash
   cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
   ```

3. Reabrir projeto no Claude Code

---

## 🎯 PRÓXIMO PASSO RECOMENDADO

**Agora que está tudo configurado, faça:**

### **1. Documentar Epic Health Score (2-3h)**

```bash
@sm

Eu: "Preciso documentar retrospectivamente o Epic Health Score. 
Já implementamos 4 agentes (Financial, NPS, Proximity, Diagnostic) 
mais o Orchestrator. O código está em src/lib/agents/. 
Crie o epic index e 5 stories marcadas como Done."

# AIOS vai criar tudo automaticamente!
```

### **2. Planejar WPP-4 Sentiment Analysis (1-2h)**

```bash
@pm

Eu: "Crie um PRD para a story WPP-4: Análise de Sentimento 
em mensagens WhatsApp. Deve usar GPT-4o-mini, analisar últimas 
100 mensagens, gerar score 0-100 e detectar flags."

# AIOS vai criar docs/prd/prd-sentiment-analysis.md
```

### **3. Implementar WPP-4 (4-6h)**

```bash
@dev

Eu: "Implemente a story WPP-4 seguindo o PRD criado."

# AIOS vai implementar código completo!
```

---

## 🏆 SUCESSO!

**Quando você conseguir:**
1. ✅ Ativar `@aios-master`
2. ✅ Carregar contexto com `*context`
3. ✅ Ver status com `*status`
4. ✅ Listar agentes com `*agents`
5. ✅ Executar primeiro comando (retrospectiva ou PRD)

**Você estará pronto para:**
- 🚀 Produtividade 3-5x maior
- ✅ Documentação automática
- ✅ Quality gates automáticos
- ✅ Workflows end-to-end

---

**BEM-VINDO AO AIOS! HORA DE DECOLAR! 🚀**
