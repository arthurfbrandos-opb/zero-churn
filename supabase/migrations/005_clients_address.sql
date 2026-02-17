-- Migration 005: Adiciona campos de endereço à tabela clients
-- Executar no Supabase SQL Editor

alter table clients
  add column if not exists cep         text,
  add column if not exists logradouro  text,
  add column if not exists numero      text,
  add column if not exists complemento text,
  add column if not exists bairro      text,
  add column if not exists cidade      text,
  add column if not exists estado      text;
