-- Migration 007: produto/serviço contratado no cliente
alter table clients
  add column if not exists service_id           text,
  add column if not exists entregaveis_incluidos jsonb default '[]'::jsonb,
  add column if not exists bonus_incluidos       jsonb default '[]'::jsonb;
