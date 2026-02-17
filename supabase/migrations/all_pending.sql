-- ============================================================
-- Zero Churn — Migrations pendentes (seguro rodar tudo de uma vez)
-- Todas usam IF NOT EXISTS / IF EXISTS — idempotentes.
-- Copie e cole no Supabase SQL Editor → Run
-- Última atualização: migration 005 (endereço)
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

-- Migration 005: campos de endereço na tabela clients
alter table clients
  add column if not exists cep         text,
  add column if not exists logradouro  text,
  add column if not exists numero      text,
  add column if not exists complemento text,
  add column if not exists bairro      text,
  add column if not exists cidade      text,
  add column if not exists estado      text;

-- Migration 006: CNPJ único por agência (partial index — só quando não nulo/vazio)
CREATE UNIQUE INDEX IF NOT EXISTS clients_agency_cnpj_unique
  ON clients (agency_id, cnpj)
  WHERE cnpj IS NOT NULL AND cnpj != '';

-- Migration 007: produto/serviço contratado
alter table clients
  add column if not exists service_id           text,
  add column if not exists entregaveis_incluidos jsonb default '[]'::jsonb,
  add column if not exists bonus_incluidos       jsonb default '[]'::jsonb;
