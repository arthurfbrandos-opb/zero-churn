-- Migration 017: Adiciona whatsapp_group_id na tabela clients
-- Esse campo estava faltando e causava "Erro ao salvar integração"

-- Adiciona coluna se não existir
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS whatsapp_group_id TEXT NULL;

-- Comentário
COMMENT ON COLUMN clients.whatsapp_group_id IS 'ID do grupo WhatsApp conectado (ex: 120363xxxxx@g.us)';

-- Índice para buscar clientes por grupo
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp_group 
  ON clients(whatsapp_group_id) 
  WHERE whatsapp_group_id IS NOT NULL;
