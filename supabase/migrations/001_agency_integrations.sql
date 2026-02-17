-- Tabela de integrações da agência
-- Cada linha = uma integração (asaas, dom_pagamentos, evolution_api...)
-- A chave de API fica criptografada com AES-256-GCM

create table if not exists agency_integrations (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  type            text not null check (type in ('asaas', 'dom_pagamentos', 'evolution_api', 'openai')),
  encrypted_key   text,           -- AES-256-GCM do JSON com credenciais
  status          text not null default 'inactive' check (status in ('active', 'inactive', 'error')),
  last_tested_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (agency_id, type)
);

alter table agency_integrations enable row level security;

create policy "CRUD integracoes da agencia"
  on agency_integrations for all
  using  (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());
