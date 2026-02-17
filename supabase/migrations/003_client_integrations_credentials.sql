-- Migration 003: Adiciona coluna credentials (jsonb) em client_integrations
-- credentials armazena dados não-sensíveis como customer_id, group_id, etc.
-- credentials_enc continua existindo para dados sensíveis (reservado para uso futuro)
-- Executar no Supabase SQL Editor

alter table client_integrations
  add column if not exists credentials jsonb;
