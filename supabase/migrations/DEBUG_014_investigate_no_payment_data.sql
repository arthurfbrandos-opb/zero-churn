-- DEBUG Migration 014: Investigação do bug no_payment_data
-- 
-- Este arquivo NÃO deve ser executado automaticamente.
-- Serve apenas como documentação e organização das queries de debug.
--
-- Bug: Flag no_payment_data aparece mesmo com Asaas conectado
-- Cliente teste: ODONTOLOGIA INTEGRADA (226cca28-d8f3-4dc5-8c92-6c9e4753a1ce)
-- Asaas customer esperado: cus_000155163105

-- ══════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR INTEGRAÇÕES DO CLIENTE
-- ══════════════════════════════════════════════════════════════════════

SELECT 
  id, 
  type, 
  status, 
  label,
  credentials,           -- JSONB com customer_id
  credentials_enc IS NOT NULL as tem_credentials_enc,
  last_sync_at,
  created_at
FROM client_integrations
WHERE client_id = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
  AND type = 'asaas';

-- Resultado esperado:
-- ✅ credentials = {"customer_id": "cus_000155163105", "customer_name": "ODONTOLOGIA INTEGRADA"}
-- ❌ credentials = null ou {} → BUG CONFIRMADO

-- ══════════════════════════════════════════════════════════════════════
-- 2. VERIFICAR INTEGRAÇÃO DA AGÊNCIA (API KEY)
-- ══════════════════════════════════════════════════════════════════════

SELECT 
  id,
  agency_id,
  type,
  status,
  encrypted_key IS NOT NULL as tem_encrypted_key,
  created_at
FROM agency_integrations
WHERE agency_id = '694e9e9e-8e69-42b8-9953-c3d9595676b9'
  AND type = 'asaas';

-- Resultado esperado:
-- ✅ tem_encrypted_key = true, status = 'active'

-- ══════════════════════════════════════════════════════════════════════
-- 3. SOLUÇÃO TEMPORÁRIA: Adicionar credentials manualmente
-- ══════════════════════════════════════════════════════════════════════
-- EXECUTAR APENAS SE credentials estiver vazio/null

-- UPDATE client_integrations
-- SET credentials = jsonb_build_object(
--   'customer_id', 'cus_000155163105',
--   'customer_name', 'ODONTOLOGIA INTEGRADA'
-- )
-- WHERE client_id = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
--   AND type = 'asaas';

-- ══════════════════════════════════════════════════════════════════════
-- 4. VERIFICAR TODAS AS INTEGRAÇÕES ASAAS (panorama geral)
-- ══════════════════════════════════════════════════════════════════════

SELECT 
  ci.id,
  c.name as client_name,
  ci.status,
  ci.credentials,
  ci.credentials IS NOT NULL as tem_credentials,
  (ci.credentials->>'customer_id') as customer_id_extraido,
  ci.last_sync_at
FROM client_integrations ci
JOIN clients c ON c.id = ci.client_id
WHERE ci.type = 'asaas'
  AND ci.agency_id = '694e9e9e-8e69-42b8-9953-c3d9595676b9'
ORDER BY ci.created_at DESC;

-- ══════════════════════════════════════════════════════════════════════
-- 5. VERIFICAR HISTÓRICO DE ANÁLISES DO CLIENTE
-- ══════════════════════════════════════════════════════════════════════

SELECT 
  id,
  score_total,
  score_financeiro,
  flags,
  triggered_by,
  analyzed_at
FROM health_scores
WHERE client_id = '226cca28-d8f3-4dc5-8c92-6c9e4753a1ce'
ORDER BY analyzed_at DESC
LIMIT 5;

-- ══════════════════════════════════════════════════════════════════════
-- NOTAS DE INVESTIGAÇÃO
-- ══════════════════════════════════════════════════════════════════════
--
-- O bug ocorre porque:
-- 1. data-fetcher.ts lê: integ.credentials.customer_id
-- 2. Se credentials estiver null/vazio, customer_id é undefined
-- 3. Loop é pulado (continue) e nenhum pagamento é buscado
-- 4. asaasPayments.length === 0
-- 5. Agente financeiro retorna flag 'no_payment_data'
--
-- Possíveis causas:
-- A) /api/asaas/import não está salvando credentials corretamente
-- B) Migration 003 (credentials jsonb) não foi aplicada
-- C) Dados foram importados antes da migration 003
--
-- Próximo passo após confirmar:
-- - Se credentials vazio → Corrigir /api/asaas/import
-- - Se credentials OK → Corrigir data-fetcher.ts
--
-- ══════════════════════════════════════════════════════════════════════
