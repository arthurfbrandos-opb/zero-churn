# ✅ Teste da Migration 015 - Entregáveis Customizados

## 🎯 Objetivo
Validar que os campos `entregaveis_customizados` e `bonus_customizados` foram criados e estão funcionando corretamente.

---

## 📋 Checklist de Testes

### 1. **Verificar no Supabase SQL Editor** ✅
Execute esta query para confirmar que as colunas existem:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name IN ('entregaveis_customizados', 'bonus_customizados');
```

**Resultado esperado:**
```
column_name                  | data_type | column_default
----------------------------|-----------|----------------
entregaveis_customizados    | jsonb     | '[]'::jsonb
bonus_customizados          | jsonb     | '[]'::jsonb
```

---

### 2. **Testar Cadastro de Novo Cliente** 🆕

**Passos:**
1. Acesse: https://zerochurn.brandosystem.com/clientes/novo
2. Preencha os dados básicos do cliente
3. Na aba **Contrato**:
   - Selecione um produto base
   - Role até **"Adicionar itens personalizados"**
   - Adicione um **entregável customizado**: "Consultoria especializada"
   - Adicione um **bônus customizado**: "Suporte prioritário"
4. Complete o cadastro
5. Salve o cliente

**Resultado esperado:**
- ✅ Cliente criado sem erros
- ✅ Itens customizados aparecem salvos
- ✅ No banco, campos JSON populados:
  ```json
  entregaveis_customizados: [
    {"id": "custom-e-1739901234567", "name": "Consultoria especializada"}
  ]
  bonus_customizados: [
    {"id": "custom-b-1739901234568", "name": "Suporte prioritário"}
  ]
  ```

---

### 3. **Testar Edição de Cliente Existente** ✏️

**Passos:**
1. Abra qualquer cliente existente
2. Clique em "Editar"
3. Vá até a aba **Contrato**
4. Role até **"Adicionar itens personalizados"**
5. Adicione novos itens customizados
6. Salve

**Resultado esperado:**
- ✅ Itens customizados salvos
- ✅ Aparecem ao reabrir a edição
- ✅ Não sobrescrevem os itens do produto base

---

### 4. **Verificar no Banco de Dados** 🔍

Execute no Supabase SQL Editor:

```sql
-- Buscar clientes com itens customizados
SELECT 
  id,
  name,
  entregaveis_customizados,
  bonus_customizados
FROM clients
WHERE 
  jsonb_array_length(entregaveis_customizados) > 0 
  OR jsonb_array_length(bonus_customizados) > 0
LIMIT 5;
```

**Resultado esperado:**
- Clientes com arrays JSON populados
- Formato correto: `[{id: string, name: string}, ...]`

---

### 5. **Teste de Integração Completa** 🎯

**Cenário completo:**

1. **Produto Base:** "Tríade Gestão Comercial"
   - Entregáveis: SEO, Gestão de Redes Sociais
   - Bônus: Relatório Mensal

2. **Cliente:** "Empresa Teste XYZ"
   - ✅ SEO (do produto)
   - ❌ Gestão de Redes (desmarcado)
   - ✅ Relatório Mensal (bônus do produto)
   - ✅ **Auditoria de site** (customizado)
   - ⭐ **Chat prioritário** (bônus customizado)

3. **Validação:**
   ```sql
   SELECT 
     service_id,
     entregaveis_incluidos,      -- ['s1']
     bonus_incluidos,             -- ['s3']
     entregaveis_customizados,   -- [{"id": "custom-e-...", "name": "Auditoria de site"}]
     bonus_customizados          -- [{"id": "custom-b-...", "name": "Chat prioritário"}]
   FROM clients 
   WHERE name = 'Empresa Teste XYZ';
   ```

---

## 🐛 Possíveis Problemas

### Erro: "column does not exist"
**Causa:** Migration não foi executada no Supabase  
**Solução:** Executar migration 015 manualmente

### Erro: "null value in column"
**Causa:** Backend não está enviando arrays vazios  
**Solução:** Verificar que backend usa `|| []` como fallback

### Itens não aparecem após salvar
**Causa:** Frontend não está carregando os campos  
**Solução:** Verificar que o GET inclui os campos customizados

---

## ✅ Critérios de Sucesso

- [ ] Colunas existem no banco (query 1)
- [ ] Cadastro de cliente funciona (teste 2)
- [ ] Edição de cliente funciona (teste 3)
- [ ] Dados persistem corretamente (teste 4)
- [ ] Integração completa funciona (teste 5)

---

## 📊 Status

- **Migration executada:** ✅ SIM (manual no Supabase)
- **Backend atualizado:** ✅ SIM (commits 4dc63a6, 1bb9549)
- **Frontend atualizado:** ✅ SIM (cadastro + edição)
- **Deploy realizado:** ✅ SIM (Vercel auto-deploy)
- **Aguardando:** ⏳ Testes manuais

---

## 🚀 Próximos Passos

1. ✅ Executar query de verificação (teste 1)
2. 🧪 Testar cadastro completo (teste 2)
3. 🧪 Testar edição (teste 3)
4. ✅ Validar dados no banco (teste 4)
5. 📝 Marcar como concluído

---

**Data:** 19/02/2026  
**Responsável:** Arthur + Claude  
**Status:** ⏳ Aguardando validação
