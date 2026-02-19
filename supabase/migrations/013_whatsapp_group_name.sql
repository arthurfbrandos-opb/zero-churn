-- Migration 013: Adiciona nome do grupo WhatsApp
-- Criado em: 19/02/2026
-- Objetivo: Salvar o nome do grupo WhatsApp para exibir nas integrações

ALTER TABLE clients
ADD COLUMN whatsapp_group_name TEXT NULL;

COMMENT ON COLUMN clients.whatsapp_group_name IS 'Nome do grupo WhatsApp conectado (salvo ao vincular)';
