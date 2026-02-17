-- Zero Churn - Schema completo do banco de dados
-- Sprint 1 - v1.1
-- Execute no SQL Editor do Supabase

-- EXTENSOES
create extension if not exists "pgcrypto";

-- TABLE: agencies
create table if not exists agencies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique,
  logo_url        text,
  analysis_day    int  default 5 check (analysis_day between 1 and 28),
  plan            text default 'starter' check (plan in ('starter','growth','enterprise')),
  onboarding_done boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- TABLE: agency_users
create table if not exists agency_users (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid references agencies(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  role       text default 'admin' check (role in ('admin','viewer')),
  created_at timestamptz default now(),
  unique(agency_id, user_id)
);

-- TABLE: clients
create table if not exists clients (
  id                uuid primary key default gen_random_uuid(),
  agency_id         uuid references agencies(id) on delete cascade not null,
  name              text not null,
  nome_resumido     text,
  razao_social      text,
  cnpj              text,
  segment           text,
  client_type       text not null check (client_type in ('mrr','tcv')),
  mrr_value         numeric(10,2),
  tcv_value         numeric(10,2),
  contract_start    date,
  contract_end      date,
  whatsapp_group_id text,
  observations      text,
  status            text default 'active' check (status in ('active','inactive')),
  payment_status    text default 'em_dia' check (payment_status in ('em_dia','vencendo','inadimplente')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- TABLE: churn_records
create table if not exists churn_records (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references clients(id) on delete cascade not null,
  agency_id      uuid references agencies(id) on delete cascade not null,
  category       text not null,
  detail         text,
  inactivated_at timestamptz default now(),
  inactivated_by uuid references auth.users(id),
  reactivated_at timestamptz
);

-- TABLE: client_integrations
create table if not exists client_integrations (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references clients(id) on delete cascade not null,
  agency_id       uuid references agencies(id) on delete cascade not null,
  type            text not null check (type in ('whatsapp','asaas','dom_pagamentos','meta_ads','google_ads')),
  status          text default 'disconnected' check (status in ('connected','disconnected','error')),
  credentials_enc text,
  last_sync_at    timestamptz,
  error_message   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(client_id, type)
);

-- TABLE: health_scores
create table if not exists health_scores (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid references clients(id) on delete cascade not null,
  agency_id         uuid references agencies(id) on delete cascade not null,
  score_total       numeric(5,2) not null,
  score_financeiro  numeric(5,2),
  score_proximidade numeric(5,2),
  score_resultado   numeric(5,2),
  score_nps         numeric(5,2),
  churn_risk        text check (churn_risk in ('low','medium','high')),
  diagnosis         text,
  flags             jsonb default '[]',
  triggered_by      text default 'scheduled' check (triggered_by in ('scheduled','manual')),
  tokens_used       int,
  cost_brl          numeric(8,4),
  analyzed_at       timestamptz default now()
);

-- TABLE: action_items
create table if not exists action_items (
  id              uuid primary key default gen_random_uuid(),
  health_score_id uuid references health_scores(id) on delete cascade not null,
  client_id       uuid references clients(id) on delete cascade not null,
  agency_id       uuid references agencies(id) on delete cascade not null,
  text            text not null,
  is_done         boolean default false,
  done_by         uuid references auth.users(id),
  done_at         timestamptz,
  created_at      timestamptz default now()
);

-- TABLE: form_tokens
create table if not exists form_tokens (
  id           uuid primary key default gen_random_uuid(),
  token        text unique not null default encode(gen_random_bytes(32), 'hex'),
  client_id    uuid references clients(id) on delete cascade not null,
  agency_id    uuid references agencies(id) on delete cascade not null,
  sent_via     text check (sent_via in ('whatsapp','email','manual')),
  sent_at      timestamptz default now(),
  expires_at   timestamptz default (now() + interval '30 days'),
  responded_at timestamptz,
  created_at   timestamptz default now()
);

-- TABLE: form_submissions
create table if not exists form_submissions (
  id              uuid primary key default gen_random_uuid(),
  token_id        uuid references form_tokens(id) on delete set null,
  client_id       uuid references clients(id) on delete cascade not null,
  agency_id       uuid references agencies(id) on delete cascade not null,
  score_resultado int check (score_resultado between 0 and 10),
  nps_score       int check (nps_score between 0 and 10),
  comment         text,
  submitted_at    timestamptz default now(),
  ip_hash         text
);

-- TABLE: alerts
create table if not exists alerts (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid references agencies(id) on delete cascade not null,
  client_id  uuid references clients(id) on delete cascade,
  type       text not null,
  severity   text not null check (severity in ('high','medium','low')),
  message    text not null,
  is_read    boolean default false,
  created_at timestamptz default now()
);

-- TABLE: analysis_logs
create table if not exists analysis_logs (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  client_id       uuid references clients(id) on delete cascade,
  health_score_id uuid references health_scores(id),
  triggered_by    text default 'scheduled' check (triggered_by in ('scheduled','manual')),
  status          text check (status in ('running','completed','failed','skipped')),
  agents_log      jsonb default '{}',
  tokens_used     int,
  cost_brl        numeric(8,4),
  error_message   text,
  started_at      timestamptz default now(),
  finished_at     timestamptz
);

-- INDICES
create index if not exists idx_clients_agency          on clients(agency_id);
create index if not exists idx_clients_status          on clients(status);
create index if not exists idx_health_scores_client    on health_scores(client_id, analyzed_at desc);
create index if not exists idx_alerts_agency           on alerts(agency_id, is_read, created_at desc);
create index if not exists idx_form_tokens_token       on form_tokens(token);
create index if not exists idx_form_submissions_client on form_submissions(client_id, submitted_at desc);
create index if not exists idx_action_items_client     on action_items(client_id, is_done);

-- FUNCAO HELPER: get_agency_id()
create or replace function get_agency_id()
returns uuid
language sql stable
as $$
  select agency_id
  from agency_users
  where user_id = auth.uid()
  limit 1;
$$;

-- HABILITAR RLS em todas as tabelas
alter table agencies            enable row level security;
alter table agency_users        enable row level security;
alter table clients             enable row level security;
alter table churn_records       enable row level security;
alter table client_integrations enable row level security;
alter table health_scores       enable row level security;
alter table action_items        enable row level security;
alter table form_tokens         enable row level security;
alter table form_submissions    enable row level security;
alter table alerts              enable row level security;
alter table analysis_logs       enable row level security;

-- RLS POLICIES: agencies
create policy "Ver propria agencia"
  on agencies for select
  using (id = get_agency_id());

create policy "Editar propria agencia"
  on agencies for update
  using (id = get_agency_id());

-- RLS POLICIES: agency_users
create policy "Ver membros da agencia"
  on agency_users for select
  using (agency_id = get_agency_id());

create policy "Inserir agency_users"
  on agency_users for insert
  with check (true);

-- RLS POLICIES: clients
create policy "CRUD clientes da agencia"
  on clients for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- RLS POLICIES: churn_records
create policy "CRUD churn_records da agencia"
  on churn_records for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- RLS POLICIES: client_integrations
create policy "CRUD integracoes da agencia"
  on client_integrations for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- RLS POLICIES: health_scores
create policy "CRUD health_scores da agencia"
  on health_scores for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- RLS POLICIES: action_items
create policy "CRUD action_items da agencia"
  on action_items for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- RLS POLICIES: form_tokens
create policy "CRUD form_tokens da agencia"
  on form_tokens for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

create policy "Formulario publico le token"
  on form_tokens for select
  using (true);

-- RLS POLICIES: form_submissions
create policy "CRUD submissions da agencia"
  on form_submissions for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- RLS POLICIES: alerts
create policy "CRUD alertas da agencia"
  on alerts for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- RLS POLICIES: analysis_logs
create policy "CRUD logs da agencia"
  on analysis_logs for all
  using (agency_id = get_agency_id())
  with check (agency_id = get_agency_id());

-- TRIGGER: updated_at automatico
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agencies_updated_at
  before update on agencies
  for each row execute function set_updated_at();

create trigger clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

create trigger integrations_updated_at
  before update on client_integrations
  for each row execute function set_updated_at();
