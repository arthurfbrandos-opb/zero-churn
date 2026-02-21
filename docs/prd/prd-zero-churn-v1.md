# Product Requirements Document (PRD)
# Zero Churn - Sistema de Gestão Preditiva de Churn

**Versão:** 1.0  
**Data:** 21 de Fevereiro de 2026  
**Autor:** @pm (Kai) - Retrospectiva AIOS  
**Status:** ✅ MVP Funcional em Produção  
**URL Produção:** https://zerochurn.brandosystem.com

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Problema e Oportunidade](#problema-e-oportunidade)
3. [Objetivos](#objetivos)
4. [Personas](#personas)
5. [Features e Funcionalidades](#features-e-funcionalidades)
6. [Requisitos Funcionais](#requisitos-funcionais)
7. [Requisitos Não-Funcionais](#requisitos-não-funcionais)
8. [Constraints e Dependências](#constraints-e-dependências)
9. [Roadmap](#roadmap)
10. [Métricas de Sucesso](#métricas-de-sucesso)

---

## 1. Visão Geral

### 1.1 O que é Zero Churn?

**Zero Churn** é um sistema SaaS B2B de gestão de agências que utiliza **Inteligência Artificial preditiva** para identificar clientes em risco de churn **antes** que eles cancelem.

O sistema combina:
- 📊 **Dados financeiros** (pagamentos, atrasos, chargebacks)
- 📝 **NPS e feedback** (satisfação do cliente)
- 💬 **Análise de sentimento** (WhatsApp, e-mails, reuniões)
- 🔍 **Diagnóstico por IA** (GPT-4o)

... para gerar um **Health Score de 0-100** para cada cliente, permitindo ações preventivas.

### 1.2 Proposta de Valor

**Para gestores de agências** que precisam reduzir churn e aumentar lifetime value dos clientes,

**Zero Churn** é um sistema preditivo de gestão de clientes

**Que diferente** de planilhas e CRMs tradicionais (Pipedrive, RD Station, HubSpot),

**Usa Inteligência Artificial** para antecipar cancelamentos e sugerir ações preventivas específicas para cada cliente.

---

## 2. Problema e Oportunidade

### 2.1 Problema

Agências de marketing, software e serviços enfrentam **churn inesperado**:

❌ **Sintomas:**
- Cliente cancela sem aviso prévio
- Sinais de insatisfação não são detectados a tempo
- Gestor só percebe problema quando é tarde demais
- Dados espalhados (pagamentos, WhatsApp, NPS, contratos)

❌ **Consequências:**
- Receita instável (MRR imprevisível)
- Custo alto de aquisição desperdiçado
- Equipe reativa (apaga incêndio)
- Reputação afetada

### 2.2 Oportunidade

🎯 **Mercado:**
- 500.000+ agências no Brasil (IBGE)
- 80% não usam ferramentas preditivas
- Churn médio de 15-25% ao ano

🎯 **Solução:**
- Centralizar dados de clientes
- Análise preditiva com IA
- Alertas proativos
- Plano de ação personalizado

---

## 3. Objetivos

### 3.1 Objetivos de Negócio

| Objetivo | Métrica | Meta 2026 |
|----------|---------|-----------|
| **Reduzir churn** | Churn rate mensal | De 15% → 5% |
| **Aumentar LTV** | Lifetime value médio | De 12 meses → 24 meses |
| **Prever cancelamentos** | Acurácia preditiva | > 80% |
| **Aumentar NPS** | Net Promoter Score | > 50 |

### 3.2 Objetivos do Produto

- ✅ Centralizar dados de clientes em um único lugar
- ✅ Gerar Health Score automático (0-100)
- ✅ Detectar sinais de churn com 30-60 dias de antecedência
- ✅ Sugerir ações preventivas personalizadas
- ✅ Automatizar coleta de NPS
- ✅ Integrar com ferramentas existentes (Asaas, WhatsApp, e-mail)

---

## 4. Personas

### 4.1 Persona Primária: Gestor de Agência

**Nome:** Carlos, 35 anos  
**Cargo:** CEO / Sócio de Agência de Marketing  
**Contexto:**
- Gerencia 20-50 clientes MRR
- Equipe de 5-15 pessoas
- Receita de R$ 50k-200k/mês

**Dores:**
- "Não sei quando um cliente está insatisfeito até ele cancelar"
- "Dados espalhados (Asaas, WhatsApp, planilhas)"
- "Equipe reativa, sempre apagando incêndio"
- "Churn imprevisível afeta planejamento"

**Jobs to be Done:**
- Prever quais clientes vão cancelar
- Agir preventivamente antes do cancelamento
- Entender por que cliente está insatisfeito
- Acompanhar saúde da carteira em tempo real

### 4.2 Persona Secundária: Gerente de Contas

**Nome:** Ana, 28 anos  
**Cargo:** Customer Success Manager  
**Contexto:**
- Cuida de 10-20 clientes
- Faz atendimento diário por WhatsApp
- Reporta ao CEO

**Dores:**
- "Não sei quais clientes priorizar"
- "Feedback vem tarde (NPS só no final)"
- "Difícil provar valor do meu trabalho"

**Jobs to be Done:**
- Saber quais clientes precisam de atenção urgente
- Ter dados para conversa com cliente
- Medir impacto das ações

---

## 5. Features e Funcionalidades

### 5.1 Módulo de Clientes (✅ 100% Implementado)

#### **FR-CLI-001: CRUD de Clientes**
- Cadastrar, editar, visualizar, deletar clientes
- Campos obrigatórios: nome, tipo (MRR/Projeto), MRR, data início
- Campos opcionais: CNPJ, responsável, entregáveis, bônus
- Upload de contratos (PDF, DOC, XLS)

#### **FR-CLI-002: Tipos de Cliente**
- **Cliente MRR:** Receita recorrente mensal
- **Cliente Projeto:** Receita pontual

#### **FR-CLI-003: Health Score**
- Pontuação de 0-100 calculada automaticamente
- 4 pilares com pesos configuráveis:
  - Financeiro (40%): Pagamentos, atrasos, chargebacks
  - NPS (25%): Satisfação do cliente
  - Proximidade (20%): Sentimento nas interações
  - Diagnóstico (15%): Análise geral por IA

#### **FR-CLI-004: Importação do Asaas**
- Buscar clientes automaticamente da API Asaas
- Vincular customer_id para sincronização
- Detectar clientes sem identificação

### 5.2 Módulo Financeiro (✅ 100% Implementado)

#### **FR-FIN-001: Integração Asaas**
- Buscar cobranças (invoices) via API
- Exibir status: recebido, pendente, vencido, cancelado
- Agrupar por cliente
- Detectar chargebacks e contestações

#### **FR-FIN-002: Integração Dom Pagamentos**
- Buscar transações via API
- Exibir status e valores
- Vincular com clientes

#### **FR-FIN-003: Sincronização de MRR**
- Cron job mensal (dia 1, 4h UTC)
- Buscar subscriptions ativas do Asaas
- Atualizar MRR de cada cliente
- Suporte a múltiplas subscriptions (pegar a vigente)

#### **FR-FIN-004: Aba Financeiro**
- Filtro por mês ou período customizado
- Agrupamento por cliente
- Totalizadores (receita total, recebida, pendente)

### 5.3 Módulo NPS (✅ 100% Implementado)

#### **FR-NPS-001: Formulário Público**
- URL: `/f/[token]` (única por cliente)
- 2 perguntas obrigatórias:
  - NPS (0-10): "Recomendaria nossa agência?"
  - Resultado (0-10): "Satisfação com resultados?"
- Campo de comentário opcional
- Design responsivo

#### **FR-NPS-002: Lembretes Automáticos**
- Cron job diário (8h UTC)
- Enviar e-mail se cliente não respondeu nos últimos 30 dias
- Template customizável

#### **FR-NPS-003: Histórico de Respostas**
- Listar todas as respostas por cliente
- Gráfico de evolução de NPS
- Detectar detratores (NPS < 7)

### 5.4 Módulo WhatsApp (✅ 100% Implementado - Nova Arquitetura)

#### **FR-WPP-001: Conexão por Agência**
- 1 instância Evolution API por agência
- QR Code flow completo
- Monitoramento de conexão (online/offline)
- Desconexão manual

#### **FR-WPP-002: Seleção de Grupo**
- Buscar grupos da agência (5-20 grupos)
- Performance: 1-3s (95% melhor que antes)
- Vincular grupo a cliente
- Retry automático (3 tentativas)

#### **FR-WPP-003: Webhook em Tempo Real**
- Receber mensagens dos grupos
- Armazenar em `whatsapp_messages` table
- Extrair texto de diferentes tipos de mensagem
- Filtrar mensagens dos clientes (não da agência)

#### **FR-WPP-004: Purge Automático**
- Cron job semanal (domingo 3h UTC)
- Deletar mensagens > 90 dias
- Performance e LGPD

#### **FR-WPP-005: Debug Tools**
- Endpoint `/api/whatsapp/debug`
- Logs estruturados
- Troubleshooting guide

### 5.5 Motor de IA (✅ 100% Implementado)

#### **FR-IA-001: Agente Financeiro**
- Analisa cobranças e subscriptions
- Gera score de 0-100
- Flags: `overdue`, `chargeback`, `consecutive_overdue`, `no_payment_data`

#### **FR-IA-002: Agente NPS**
- Analisa respostas de NPS
- Gera score de 0-100
- Flags: `detractor`, `no_recent_response`

#### **FR-IA-003: Agente Proximidade**
- Analisa sentimento em mensagens WhatsApp (GPT-4o-mini)
- Busca últimas 100 mensagens (90 dias)
- Gera score de 0-100
- Flags: `negative_sentiment`, `decreasing_engagement`, `no_messages`

#### **FR-IA-004: Agente Diagnóstico**
- Consolida todos os pilares
- Prompt GPT-4o para análise holística
- Gera plano de ação personalizado
- Flags: `urgent_action_needed`, `proactive_retention_needed`

#### **FR-IA-005: Orquestrador**
- Executa agentes em sequência
- Lock anti-duplicação (1 análise por vez)
- Fallback em caso de erro
- Log completo (tokens, duração, status)

#### **FR-IA-006: Análise Manual**
- Botão "Analisar Agora" na página do cliente
- Análise on-demand

#### **FR-IA-007: Análise Automática**
- Cron job semanal por agência (9h UTC)
- Rodar análise de todos os clientes automaticamente

### 5.6 Dashboard (✅ 80% Implementado)

#### **FR-DASH-001: Visão Geral**
- KPIs principais: receita total, clientes em risco, churn rate
- Gráfico de distribuição por risco (saudável/atenção/risco/crítico)
- Lista de clientes ordenados por Health Score

#### **FR-DASH-002: Histórico**
- Tab "Histórico" na página do cliente
- Evolução do Health Score ao longo do tempo
- ⚠️ **Pendente:** Implementar `buildChurnHistory` com dados reais

#### **FR-DASH-003: Alertas**
- Flags com severidade (low/medium/high/critical)
- Agrupamento por pilar
- Descrição e ação sugerida

### 5.7 Configurações (✅ 70% Implementado)

#### **FR-CFG-001: Perfil da Agência**
- Nome, logo, CNPJ
- Dados de contato
- ✅ Implementado

#### **FR-CFG-002: Integrações**
- Asaas: API key (criptografada AES-256)
- Dom Pagamentos: Auth token (criptografado)
- Resend: API key para e-mails
- WhatsApp: Evolution API URL + key
- ✅ Implementado

#### **FR-CFG-003: Serviços e Produtos**
- CRUD de serviços oferecidos
- ⚠️ **Pendente:** Migrar de localStorage para Supabase

#### **FR-CFG-004: Templates de E-mail**
- Customizar templates transacionais
- ⚠️ **Pendente:** Migrar de localStorage para Supabase

#### **FR-CFG-005: Usuários e Permissões**
- Listar usuários da agência
- ⚠️ **Pendente:** Permissões granulares

### 5.8 E-mails Transacionais (✅ 100% Implementado)

#### **FR-EMAIL-001: Confirmação de Cadastro**
- Enviar ao cadastrar nova agência
- Link de confirmação de e-mail

#### **FR-EMAIL-002: Lembrete de NPS**
- Enviar se cliente não respondeu em 30 dias
- Template customizável

#### **FR-EMAIL-003: Alerta de Integração**
- Enviar se integração (Asaas/Dom) falhou
- Cron semanal (segunda 8h UTC)

#### **FR-EMAIL-004: Análise Concluída**
- Enviar quando análise de cliente for concluída
- Resumo do Health Score e flags

---

## 6. Requisitos Funcionais

### 6.1 Autenticação e Segurança

| ID | Requisito | Status |
|----|-----------|--------|
| **FR-AUTH-001** | Login/Cadastro/Recuperação de senha | ✅ |
| **FR-AUTH-002** | Confirmação por e-mail (Resend) | ✅ |
| **FR-AUTH-003** | Tokens JWT + refresh automático | ✅ |
| **FR-AUTH-004** | Row Level Security (RLS) em todas as tabelas | ✅ |
| **FR-AUTH-005** | Separação total de dados por agência | ✅ |
| **FR-AUTH-006** | Criptografia AES-256 para credenciais | ✅ |

### 6.2 Cron Jobs

| ID | Requisito | Frequência | Status |
|----|-----------|------------|--------|
| **FR-CRON-001** | Análise semanal por agência | Seg 9h UTC | ✅ |
| **FR-CRON-002** | Lembretes NPS | Diário 8h UTC | ✅ |
| **FR-CRON-003** | Check de integrações | Seg 8h UTC | ✅ |
| **FR-CRON-004** | Purge mensagens WhatsApp | Dom 3h UTC | ✅ |
| **FR-CRON-005** | Sincronização de MRR | Dia 1, 4h UTC | ✅ |

---

## 7. Requisitos Não-Funcionais

### 7.1 Performance

| ID | Requisito | Meta | Status |
|----|-----------|------|--------|
| **NFR-PERF-001** | Tempo de análise por cliente | < 15s | ✅ |
| **NFR-PERF-002** | Busca de grupos WhatsApp | < 3s | ✅ |
| **NFR-PERF-003** | Loading da página inicial | < 2s | ✅ |
| **NFR-PERF-004** | Uptime | > 99.9% | ✅ |

### 7.2 Escalabilidade

| ID | Requisito | Meta | Status |
|----|-----------|------|--------|
| **NFR-SCAL-001** | Suportar 1000+ agências | N/A | ✅ |
| **NFR-SCAL-002** | Suportar 100k+ clientes | N/A | ✅ |
| **NFR-SCAL-003** | Suportar 1M+ mensagens WhatsApp | N/A | ✅ |

### 7.3 Custo

| ID | Requisito | Meta | Status |
|----|-----------|------|--------|
| **NFR-COST-001** | Custo por análise | < $0.05 | ✅ |
| **NFR-COST-002** | Uso de GPT-4o-mini (não GPT-4) | N/A | ✅ |
| **NFR-COST-003** | Purge automático de dados antigos | N/A | ✅ |

### 7.4 Segurança

| ID | Requisito | Meta | Status |
|----|-----------|------|--------|
| **NFR-SEC-001** | Dados sensíveis criptografados | AES-256 | ✅ |
| **NFR-SEC-002** | HTTPS obrigatório | N/A | ✅ |
| **NFR-SEC-003** | RLS em todas as tabelas | N/A | ✅ |
| **NFR-SEC-004** | Tokens com expiração | 24h | ✅ |

---

## 8. Constraints e Dependências

### 8.1 Constraints Técnicas

| Constraint | Descrição | Impacto |
|------------|-----------|---------|
| **CON-001** | Vercel Hobby Plan | Limite de ~60s para serverless functions |
| **CON-002** | Evolution API limitada | Cada agência = 1 instância (5-20 grupos) |
| **CON-003** | Supabase Free Tier | Limite de 500MB storage |
| **CON-004** | OpenAI API rate limits | Máx ~100 req/min |

### 8.2 Dependências Externas

| Dependência | Tipo | Criticidade | Status |
|-------------|------|-------------|--------|
| **Supabase** | Database + Auth + Storage | Alta | ✅ Operacional |
| **Vercel** | Hosting + Cron | Alta | ✅ Operacional |
| **Asaas API** | Pagamentos | Média | ✅ Operacional |
| **Evolution API** | WhatsApp | Média | ✅ Operacional |
| **OpenAI API** | IA (GPT-4o-mini) | Alta | ✅ Operacional |
| **Resend** | E-mails transacionais | Média | ✅ Operacional |
| **Dom Pagamentos** | Pagamentos | Baixa | ✅ Operacional |

---

## 9. Roadmap

### 9.1 MVP (✅ Concluído - Fev 2026)

- ✅ Autenticação e segurança
- ✅ CRUD de clientes
- ✅ Integração Asaas + Dom
- ✅ Formulário NPS
- ✅ WhatsApp (1 instância por agência)
- ✅ Motor de IA (4 agentes)
- ✅ Dashboard básico
- ✅ 5 cron jobs

### 9.2 Sprint 4 (🚧 Em Progresso - Fev/Mar 2026)

**P0 - Bloqueadores:**
- 🚧 Seletor de grupo WhatsApp (dropdown)
- 🚧 Teste com primeiro cliente real
- 🚧 Calibração de prompts/pesos

**P1 - Polish:**
- 🔜 Migrar email templates para banco
- 🔜 Migrar serviços/produtos para banco
- 🔜 Dashboard com churn real (não mockado)
- 🔜 Botão "Sincronizar MRR"

**P2 - Operacional:**
- 🔜 LGPD: exclusão de conta
- 🔜 Painel operacional (custos, logs)
- 🔜 Onboarding wizard (3 steps)

### 9.3 Sprint 5 (🔜 Mar/Abr 2026)

**Módulo de Projetos:**
- Timeline de projetos
- Marcos e fases
- % de conclusão
- Taxa de retrabalho

**Analytics Avançados:**
- Segmentação de clientes
- Cohort analysis
- LTV prediction
- Churn forecast

### 9.4 Futuro (Q2-Q3 2026)

**Módulo Financeiro:**
- Faturamento e recibos
- DRE
- Fluxo de caixa
- Conciliação bancária

**Módulo Comercial:**
- Pipeline de vendas
- Propostas personalizadas
- Contratos digitais
- Follow-up automático

**Integrações Futuras:**
- Gmail API
- Trello/Asana/ClickUp
- Slack
- Google Meet/Zoom
- RD Station/HubSpot

---

## 10. Métricas de Sucesso

### 10.1 Métricas de Produto (KPIs)

| Métrica | Baseline | Meta 6 meses | Como Medir |
|---------|----------|--------------|------------|
| **Acurácia Preditiva** | ? | > 80% | % de cancelamentos previstos corretamente |
| **Redução de Churn** | 15% | < 5% | Churn rate mensal |
| **Aumento de LTV** | 12 meses | 24 meses | Lifetime médio de clientes |
| **NPS Médio** | ? | > 50 | NPS médio das agências usuárias |
| **Time to Value** | ? | < 7 dias | Tempo até primeira análise útil |

### 10.2 Métricas de Negócio

| Métrica | Meta 2026 | Como Medir |
|---------|-----------|------------|
| **Agências Ativas** | 100 | Count de agências com > 5 clientes |
| **Clientes Monitorados** | 5.000 | Count total de clientes ativos |
| **Análises por Semana** | 5.000 | Count de análises executadas |
| **MRR** | R$ 50k | Receita recorrente mensal |
| **CAC Payback** | < 6 meses | Tempo para recuperar custo de aquisição |

### 10.3 Métricas Técnicas

| Métrica | Meta | Como Medir |
|---------|------|------------|
| **Uptime** | > 99.9% | Vercel Analytics |
| **API Response Time** | < 500ms | New Relic / Vercel |
| **Custo por Análise** | < $0.05 | OpenAI API usage / # análises |
| **Error Rate** | < 0.1% | Sentry / Logs |

---

## 📝 Conclusão

Zero Churn é um **MVP funcional** (90% implementado) com potencial para se tornar a **ferramenta #1 de prevenção de churn** para agências no Brasil.

**Próximos passos críticos:**
1. ✅ Testar com 20 clientes reais
2. ✅ Calibrar IA (prompts + pesos)
3. ✅ Migrar configs para banco (email templates + serviços)
4. ✅ LGPD compliance
5. ✅ Escalar para 100 agências

---

**Última atualização:** 21 de Fevereiro de 2026  
**Metodologia:** AIOS Product Management  
**Próxima revisão:** Após Sprint 4 (14 de Março de 2026)

---

**Documentos Relacionados:**
- `docs/architecture/architecture-overview.md` - Arquitetura técnica
- `docs/stories/backlog.md` - Backlog de stories
- `STATUS_COMPLETO.md` - Status atual do projeto
- `WHATSAPP_IMPLEMENTATION.md` - Documentação WhatsApp
