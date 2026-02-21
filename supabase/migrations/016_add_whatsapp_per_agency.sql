-- Migration 016: WhatsApp por Agência
-- 
-- Adiciona campos para cada agência ter seu próprio número WhatsApp conectado
-- via Evolution API. Isso resolve o problema de timeout ao listar grupos
-- (cada agência terá 5-20 grupos em vez de 100+ grupos de todas as agências).

-- Adiciona colunas na tabela agencies
ALTER TABLE agencies 
  ADD COLUMN whatsapp_instance_name TEXT NULL,
  ADD COLUMN whatsapp_phone TEXT NULL,
  ADD COLUMN whatsapp_connected_at TIMESTAMPTZ NULL,
  ADD COLUMN whatsapp_qr_code TEXT NULL;

-- Comentários
COMMENT ON COLUMN agencies.whatsapp_instance_name IS 'Nome da instância no Evolution API (ex: agency_694e9e9e)';
COMMENT ON COLUMN agencies.whatsapp_phone IS 'Número WhatsApp conectado (ex: 5511999999999)';
COMMENT ON COLUMN agencies.whatsapp_connected_at IS 'Timestamp da última conexão bem-sucedida';
COMMENT ON COLUMN agencies.whatsapp_qr_code IS 'QR Code base64 temporário (para exibir durante conexão)';

-- Índice para buscar agências por número (útil para webhooks)
CREATE INDEX idx_agencies_whatsapp_phone ON agencies(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;

-- RLS já está habilitado na tabela agencies (migration 001)
-- As policies já cobrem SELECT/UPDATE baseado em agency_users

-- Nota: O whatsapp_instance_name será gerado no formato: agency_{agency_id}
-- Exemplo: agency_694e9e9e-8e69-42b8-9953-c3d9595676b9
