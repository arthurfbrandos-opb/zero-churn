-- ============================================================
-- Migration 012: Mensagens do WhatsApp para análise de sentimento
-- Armazena mensagens via webhook da Evolution API
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id      uuid        REFERENCES clients(id) ON DELETE SET NULL,
  group_id       text        NOT NULL,          -- "120363xxx@g.us"
  message_id     text        NOT NULL,          -- key.id da Evolution API
  sender_jid     text,                          -- participant ou remoteJid
  sender_name    text,                          -- pushName
  content        text,                          -- texto extraído da mensagem
  message_type   text,                          -- "conversation" | "extendedTextMessage" | etc
  from_me        boolean     DEFAULT false,
  timestamp_unix bigint      NOT NULL,          -- unix timestamp em segundos
  received_at    timestamptz DEFAULT now(),

  UNIQUE (agency_id, message_id)
);

-- Índices para queries de análise
CREATE INDEX IF NOT EXISTS idx_wamsg_group_ts
  ON whatsapp_messages (group_id, timestamp_unix DESC);

CREATE INDEX IF NOT EXISTS idx_wamsg_client_ts
  ON whatsapp_messages (client_id, timestamp_unix DESC);

CREATE INDEX IF NOT EXISTS idx_wamsg_agency_ts
  ON whatsapp_messages (agency_id, timestamp_unix DESC);

-- RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members can read their messages"
  ON whatsapp_messages FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_users WHERE user_id = auth.uid()
    )
  );

-- Service role pode inserir via webhook (sem autenticação de usuário)
CREATE POLICY "service role can insert messages"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE whatsapp_messages IS
  'Mensagens de grupos WhatsApp recebidas via webhook da Evolution API. Alimenta o agente de Proximidade.';
