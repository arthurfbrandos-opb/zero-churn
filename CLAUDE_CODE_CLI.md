# 🎯 Claude Code CLI - Guia Completo

**Contexto:** Você está usando Claude Code no terminal (CLI), não desktop app

---

## 📋 **SETUP INICIAL**

### **1. Navegar para o Projeto**

```bash
cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
```

### **2. Iniciar Claude Code CLI**

```bash
# Se já tem claude instalado
claude

# Ou se instalou via npm
npx @anthropic-ai/claude-code
```

---

## 🎯 **PROMPT INICIAL (COPIE E COLE NO TERMINAL)**

Quando o Claude Code CLI iniciar, copie e cole isto:

```
Olá! Estou trabalhando no projeto Zero Churn e preciso da sua ajuda.

CONTEXTO DO PROJETO:
Leia os seguintes arquivos que estão no diretório atual:

1. SESSAO_21_FEV_2026_RESUMO.md - Resumo da última sessão
2. docs/prd/prd-zero-churn-v1.md - Product Requirements completo
3. docs/architecture/architecture-overview.md - Arquitetura técnica
4. docs/stories/README.md - Guia de stories
5. RETROSPECTIVA_AIOS.md - Retrospectiva AIOS

TAREFA INICIAL:
Depois de ler esses arquivos, me confirme que entendeu o projeto respondendo:
1. O que é o Zero Churn?
2. Qual a stack tecnológica?
3. Status atual (% implementado)?
4. Próximos passos?

Estou no diretório: /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
```

---

## 📝 **APÓS CONFIRMAÇÃO, PRIMEIRA TAREFA:**

### **Opção A: Documentar Epic Health Score** (RECOMENDADO)

```
Perfeito! Agora atue como Scrum Master AIOS e documente o Epic Health Score.

CONTEXTO:
O Health Score já está implementado com 4 agentes de IA:
- src/lib/agents/financial.ts (Agente Financeiro)
- src/lib/agents/nps.ts (Agente NPS)  
- src/lib/agents/proximity.ts (Agente Proximidade)
- src/lib/agents/diagnostic.ts (Agente Diagnóstico)
- src/lib/agents/orchestrate-analysis.ts (Orquestrador)

TAREFA:
Crie 6 arquivos de documentação retrospectiva em docs/stories/epics/epic-health-score/

Arquivos a criar:
1. EPIC-HS-INDEX.md (overview do epic)
2. story-hs-1-financial-agent.md (Status: Done)
3. story-hs-2-nps-agent.md (Status: Done)
4. story-hs-3-proximity-agent.md (Status: Done)
5. story-hs-4-diagnostic-agent.md (Status: Done)
6. story-hs-5-orchestrator.md (Status: Done)

PADRÃO:
Use como referência:
- docs/stories/epics/epic-whatsapp/EPIC-WPP-INDEX.md
- docs/stories/epics/epic-whatsapp/story-wpp-1-agency-connection.md

Todas as stories devem estar marcadas como "Done" pois já estão implementadas.

INSTRUÇÕES:
1. Leia o código fonte dos agentes para entender a implementação
2. Leia as referências (epic-whatsapp) para seguir o formato
3. Crie o conteúdo completo de cada arquivo
4. Use o comando correto do CLI para criar os arquivos

Comece agora!
```

---

## 🔧 **COMANDOS DO CLAUDE CODE CLI**

### **Comandos Básicos:**

```bash
# Ver arquivos do projeto
ls -la

# Ler um arquivo
cat docs/prd/prd-zero-churn-v1.md

# Criar arquivo
# (Claude vai sugerir o comando correto)

# Ver estrutura de pastas
tree -L 3 docs/

# Sair do Claude Code CLI
exit
```

### **Como Claude Cria Arquivos:**

Claude Code CLI vai sugerir comandos como:

```bash
# Opção 1: Criar arquivo diretamente
cat > docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md << 'EOF'
[conteúdo aqui]
EOF

# Opção 2: Usar editor
nano docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md

# Opção 3: Echo para arquivo
echo "[conteúdo]" > arquivo.md
```

**Você só precisa:**
1. Copiar o comando que Claude sugerir
2. Colar no terminal
3. Executar

---

## 📊 **WORKFLOW COMPLETO NO CLI:**

```
┌─────────────────────────────────────┐
│ 1. cd zero-churn/                  │
│ 2. claude (ou npx ...)             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Colar prompt de contexto        │
│ 4. Aguardar Claude ler arquivos    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Colar prompt de tarefa          │
│    (Documentar Epic HS)            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 6. Claude cria conteúdo            │
│ 7. Claude sugere comandos          │
│ 8. Você copia/cola comandos        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 9. Arquivos criados! ✅            │
│ 10. git add, commit, push          │
└─────────────────────────────────────┘
```

---

## 🎯 **EXEMPLO PRÁTICO (TERMINAL):**

```bash
# Terminal 1: Iniciar Claude Code CLI
$ cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
$ claude

# Claude Code CLI inicia...
# Você cola o prompt de contexto
Claude> [aguarda resposta...]

# Claude responde confirmando entendimento
Claude> "Entendi! Zero Churn é um SaaS de gestão preditiva..."

# Você cola o prompt de tarefa (Epic Health Score)
You> [prompt documentar Epic HS]

# Claude cria conteúdo e sugere comando
Claude> "Vou criar o EPIC-HS-INDEX.md. Execute este comando:

cat > docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md << 'EOF'
# Epic Health Score
...
[conteúdo completo]
...
EOF
"

# Você copia e cola o comando no terminal
$ cat > docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md << 'EOF'
...
EOF

# Arquivo criado! ✅
$ ls -la docs/stories/epics/epic-health-score/
EPIC-HS-INDEX.md ✅

# Repetir para os outros 5 arquivos
```

---

## ✅ **COMANDOS ÚTEIS NO CLI:**

### **Durante a Sessão:**

```bash
# Ver o que Claude está fazendo
# (ele vai te dizer no próprio chat)

# Listar arquivos criados
ls -la docs/stories/epics/epic-health-score/

# Ver conteúdo de arquivo criado
cat docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md

# Criar diretório se não existir
mkdir -p docs/stories/epics/epic-health-score

# Verificar git status
git status

# Commitar arquivos criados
git add docs/stories/epics/epic-health-score/
git commit -m "docs: Epic Health Score retrospectivo (AIOS)"
git push origin main
```

---

## 🚨 **TROUBLESHOOTING CLI:**

### **Problema 1: Claude não inicia**

```bash
# Verificar se claude está instalado
which claude

# Se não estiver, instalar
npm install -g @anthropic-ai/claude-code

# Ou usar npx
npx @anthropic-ai/claude-code
```

### **Problema 2: Erro de permissão ao criar arquivo**

```bash
# Verificar permissões
ls -la docs/stories/epics/

# Criar diretório primeiro
mkdir -p docs/stories/epics/epic-health-score

# Tentar novamente
```

### **Problema 3: Claude não lê arquivos**

```bash
# Verificar se arquivos existem
ls -la SESSAO_21_FEV_2026_RESUMO.md
ls -la docs/prd/prd-zero-churn-v1.md

# Ver conteúdo (para confirmar)
head -20 SESSAO_21_FEV_2026_RESUMO.md

# Copiar caminho absoluto se necessário
pwd
# /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
```

---

## 📋 **CHECKLIST RÁPIDO:**

Antes de começar:
- [x] ✅ Migration 017 rodada no Supabase
- [ ] ⏳ Terminal aberto
- [ ] ⏳ Navegado até zero-churn/
- [ ] ⏳ Claude Code CLI instalado
- [ ] ⏳ Claude Code CLI iniciado
- [ ] ⏳ Prompt de contexto colado
- [ ] ⏳ Confirmação recebida
- [ ] ⏳ Prompt de tarefa colado
- [ ] ⏳ Arquivos criados

---

## 🎯 **RESUMÃO PARA CLI:**

### **1. Terminal:**

```bash
cd /Users/arthurferreira/Documents/github/Projeto_Zero_Churn/zero-churn
claude
```

### **2. Primeiro Prompt (colar no Claude CLI):**

```
Leia estes arquivos do diretório atual:
1. SESSAO_21_FEV_2026_RESUMO.md
2. docs/prd/prd-zero-churn-v1.md
3. docs/architecture/architecture-overview.md

Confirme que entendeu o projeto Zero Churn.
```

### **3. Segundo Prompt (após confirmação):**

```
Atue como Scrum Master e crie documentação retrospectiva do Epic Health Score.

Crie 6 arquivos em docs/stories/epics/epic-health-score/:
1. EPIC-HS-INDEX.md
2. story-hs-1-financial-agent.md (Done)
3. story-hs-2-nps-agent.md (Done)
4. story-hs-3-proximity-agent.md (Done)
5. story-hs-4-diagnostic-agent.md (Done)
6. story-hs-5-orchestrator.md (Done)

Use padrão de docs/stories/epics/epic-whatsapp/

Código fonte em src/lib/agents/

Comece!
```

### **4. Executar Comandos:**

Claude vai sugerir comandos. Você:
1. Copia comando
2. Cola no terminal
3. Executa
4. Repete para próximo arquivo

### **5. Commit:**

```bash
git add docs/stories/epics/epic-health-score/
git commit -m "docs: Epic Health Score retrospectivo"
git push origin main
```

---

## ⏱️ **TEMPO TOTAL: 15-20 MIN**

- Min 0-3: Setup (cd, claude)
- Min 3-6: Contexto + confirmação
- Min 6-9: Tarefa + Claude cria conteúdo
- Min 9-18: Executar comandos (6 arquivos)
- Min 18-20: Git commit + push

**Resultado:**
- ✅ 6 arquivos criados
- ✅ Epic Health Score documentado
- ✅ Pronto para próxima feature!

---

## 💡 **DICA PRO:**

Se Claude sugerir um comando MUITO longo (>100 linhas), você pode:

```bash
# Opção 1: Salvar em arquivo temporário
claude-output.sh

# Executar
chmod +x claude-output.sh
./claude-output.sh

# Ou Opção 2: Criar arquivo manualmente
nano docs/stories/epics/epic-health-score/EPIC-HS-INDEX.md
# Colar conteúdo que Claude gerou
# Ctrl+X, Y, Enter para salvar
```

---

**AGORA SIM! INSTRUÇÕES CORRETAS PARA CLAUDE CODE CLI!** 🚀

**ESTÁ TUDO PRONTO! É SÓ COMEÇAR NO TERMINAL!** 🎯
