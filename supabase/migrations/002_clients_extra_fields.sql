-- Migration 002: Adiciona campos de contato e decisor à tabela clients
-- Executar no Supabase SQL Editor

alter table clients
  add column if not exists nome_decisor    text,
  add column if not exists email           text,
  add column if not exists telefone        text,
  add column if not exists email_financeiro text;
