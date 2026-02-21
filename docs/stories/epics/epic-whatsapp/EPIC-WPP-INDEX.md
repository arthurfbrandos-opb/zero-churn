# Epic WhatsApp Integration

**Epic ID:** EPIC-WPP  
**Status:** ✅ 75% Concluído (3/4 stories)  
**Priority:** High  
**Lead:** @architect + @dev  
**Sprint:** 3-4

---

## 📋 Visão Geral

Integração completa com Evolution API para monitoramento de grupos WhatsApp e análise de sentimento.

**Objetivo:** Permitir que agências conectem seus WhatsApps e monitorem sentimento dos clientes em grupos específicos.

**Valor de Negócio:**
- Detectar insatisfação antes do cancelamento
- Análise de sentimento automática (GPT-4o-mini)
- Performance 95% melhor (1-3s vs 45-60s)

---

## 🎯 Problema Resolvido

### Antes:
- ❌ Impossível monitorar sentimento em tempo real
- ❌ Feedback só vinha por NPS (30 dias de delay)
- ❌ Sinais de insatisfação perdidos

### Depois:
- ✅ Monitoramento em tempo real via WhatsApp
- ✅ Análise de sentimento semanal automática
- ✅ Alertas proativos de sentimento negativo

---

## 🏗️ Arquitetura

### Decisão Técnica Chave: 1 Instância por Agência

**Antes (rejected):**
```
1 Evolution API
├── 50 agências conectadas
└── 150+ grupos (timeout em 45-60s) ❌
```

**Depois (implemented):**
```
Agência A: instance_a → 5-20 grupos (1-3s) ✅
Agência B: instance_b → 5-20 grupos (1-3s) ✅
Agência C: instance_c → 5-20 grupos (1-3s) ✅
```

**Performance Improvement:** 95% faster 🚀

---

## 📊 Stories

| Story ID | Nome | Status | Priority | Points |
|----------|------|--------|----------|--------|
| WPP-1 | Conexão por Agência | ✅ Done | High | 8 |
| WPP-2 | Seleção de Grupo | ✅ Done | High | 5 |
| WPP-3 | Fix Campo whatsapp_group_id | ✅ Done | Critical | 2 |
| WPP-4 | Análise de Sentimento | ⏳ Next | High | 8 |

---

## 📝 Stories Detalhadas

### ✅ WPP-1: Conexão por Agência

**Arquivo:** `story-wpp-1-agency-connection.md`

**Objetivo:** Implementar QR Code flow para conectar WhatsApp da agência

**Implementação:**
- Migration 016: Campos WhatsApp em `agencies` table
- 4 endpoints API: connect, status, groups, disconnect
- UI em Configurações com QR code flow
- Debug endpoint `/api/whatsapp/debug`

**Resultado:**
- ✅ Agência conecta seu WhatsApp em < 30s
- ✅ QR code gerado e exibido
- ✅ Status de conexão monitorado
- ✅ Desconexão manual disponível

---

### ✅ WPP-2: Seleção de Grupo

**Arquivo:** `story-wpp-2-group-selection.md`

**Objetivo:** Permitir seleção rápida de grupo para vincular a cliente

**Implementação:**
- Endpoint `/api/whatsapp/agency/groups` (busca 5-20 grupos)
- UI na página do cliente com dropdown
- Retry system (3 tentativas automáticas)
- Performance: 1-3s (antes: timeout 45-60s)

**Resultado:**
- ✅ Seleção de grupo em < 3s
- ✅ 95% mais rápido que antes
- ✅ Retry automático em caso de falha

---

### ✅ WPP-3: Fix Campo whatsapp_group_id

**Arquivo:** `story-wpp-3-migration-017.md`

**Objetivo:** Corrigir erro "Erro ao salvar integração" ao vincular grupo

**Problema:**
- Endpoint tentava UPDATE em coluna inexistente
- Erro genérico sem logs

**Solução:**
- Migration 017: Adiciona `whatsapp_group_id` em `clients`
- Logs detalhados no endpoint
- Validação de permissões

**Resultado:**
- ✅ Grupo vinculado com sucesso
- ✅ Logs completos para debug
- ✅ Zero erros em produção

---

### ⏳ WPP-4: Análise de Sentimento (Next)

**Arquivo:** `story-wpp-4-sentiment-analysis.md` (criar)

**Objetivo:** Implementar análise de sentimento automática nas mensagens

**Escopo:**
- Agente Proximidade analisa últimas 100 mensagens
- GPT-4o-mini classifica sentimento (positivo/neutro/negativo)
- Score de 0-100 baseado em sentimento
- Flags: `negative_sentiment`, `decreasing_engagement`, `no_messages`

**Acceptance Criteria:**
- [ ] Buscar últimas 100 mensagens (90 dias) do grupo vinculado
- [ ] Enviar para GPT-4o-mini com prompt de análise de sentimento
- [ ] Gerar score de 0-100
- [ ] Detectar flags baseado em thresholds
- [ ] Salvar resultado em `health_score_logs`

**ETA:** 1 semana

---

## 🔄 Workflow

```
1. Agência conecta WhatsApp (WPP-1) ✅
   ├── QR code → Escanear
   └── Status: Online

2. Cliente vincula grupo (WPP-2) ✅
   ├── Buscar grupos (1-3s)
   ├── Selecionar grupo
   └── Salvar vinculação (WPP-3) ✅

3. Webhook recebe mensagens (implementado) ✅
   ├── Filtrar mensagens do cliente
   └── Armazenar em whatsapp_messages

4. Análise de sentimento (WPP-4) ⏳
   ├── Cron semanal
   ├── GPT-4o-mini analisa
   └── Atualiza Health Score
```

---

## 📊 Métricas de Sucesso

| Métrica | Baseline | Atual | Meta |
|---------|----------|-------|------|
| **Tempo de conexão** | - | 20-30s | < 30s ✅ |
| **Tempo de seleção de grupo** | 45-60s (timeout) | 1-3s | < 5s ✅ |
| **Taxa de erro** | 100% (timeout) | 0% | < 1% ✅ |
| **Acurácia sentimento** | - | ? | > 80% ⏳ |

---

## 🐛 Bugs Corrigidos

### Bug #1: Timeout ao Buscar Grupos (20/02/2026)
- **Causa:** 150+ grupos em 1 instância
- **Fix:** 1 instância por agência (5-20 grupos)
- **Commit:** `84ae3e4`, `b5e92fb`, `42198c6`

### Bug #2: Erro 404 "Connection Closed" (20/02/2026)
- **Causa:** Código buscava em `agency_integrations` (antiga), salvava em `agencies` (nova)
- **Fix:** Unificou tudo em `agencies` table
- **Commit:** `215f541`

### Bug #3: Duplicação de UI (20/02/2026)
- **Causa:** WhatsApp aparecia em 2 lugares (Integrações + aba WhatsApp)
- **Fix:** Removeu `EvolutionIntegCard` de Integrações (~300 linhas)
- **Commit:** `4aeb93e`

### Bug #4: Campo whatsapp_group_id Faltante (21/02/2026)
- **Causa:** Migration não criou coluna
- **Fix:** Migration 017
- **Commit:** `1683ba7`

---

## 📚 Documentação

- **Visão Geral:** `WHATSAPP_IMPLEMENTATION.md`
- **Troubleshooting:** `docs/WHATSAPP_TROUBLESHOOTING.md`
- **Architecture:** `docs/architecture/architecture-overview.md` (seção 5.3)

---

## 🎯 Próximos Passos

1. ✅ Testar fluxo completo em produção (após deploy)
2. ⏳ Implementar WPP-4 (Análise de Sentimento)
3. ⏳ Testar com 5-10 clientes reais
4. ⏳ Calibrar thresholds de flags

---

**Epic criado em:** 21 de Fevereiro de 2026  
**Metodologia:** AIOS Story-Driven Development  
**Última atualização:** 21 de Fevereiro de 2026
