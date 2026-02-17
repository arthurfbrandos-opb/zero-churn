-- Migration 004: Permite múltiplas integrações por tipo por cliente
-- Ex: um cliente pode ter 2 contas no Asaas ou na Dom Pagamentos
-- Executar no Supabase SQL Editor

-- Remove a restrição que permitia apenas 1 integração por tipo
ALTER TABLE client_integrations
  DROP CONSTRAINT IF EXISTS client_integrations_client_id_type_key;

-- Adiciona label para identificar cada conta vinculada
ALTER TABLE client_integrations
  ADD COLUMN IF NOT EXISTS label text;

-- Nova restrição: não permite vincular o MESMO customer_id duas vezes para o mesmo cliente/tipo
-- (evita duplicatas exatas, mas permite contas diferentes)
CREATE UNIQUE INDEX IF NOT EXISTS client_integrations_unique_customer
  ON client_integrations (client_id, type, (credentials->>'customer_id'))
  WHERE credentials IS NOT NULL AND credentials->>'customer_id' IS NOT NULL;
