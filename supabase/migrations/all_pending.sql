-- ============================================================
-- Zero Churn — Migrations pendentes (seguro rodar tudo de uma vez)
-- Todas usam IF NOT EXISTS / IF EXISTS — idempotentes.
-- Copie e cole no Supabase SQL Editor → Run
-- ============================================================

-- Migration 002: campos de contato na tabela clients
alter table clients
  add column if not exists nome_decisor     text,
  add column if not exists email            text,
  add column if not exists telefone         text,
  add column if not exists email_financeiro text;

-- Migration 003: coluna credentials (jsonb) em client_integrations
alter table client_integrations
  add column if not exists credentials jsonb;

-- Migration 004: permite múltiplas integrações do mesmo tipo por cliente
alter table client_integrations
  drop constraint if exists client_integrations_client_id_type_key;

alter table client_integrations
  add column if not exists label text;

create unique index if not exists client_integrations_unique_customer
  on client_integrations (client_id, type, (credentials->>'customer_id'))
  where credentials is not null and credentials->>'customer_id' is not null;
