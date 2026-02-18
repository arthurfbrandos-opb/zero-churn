-- ============================================================
-- Zero Churn — Migrations pendentes (seguro rodar tudo de uma vez)
-- Todas usam IF NOT EXISTS / IF EXISTS — idempotentes.
-- Copie e cole no Supabase SQL Editor → Run
-- Última atualização: migration 011 (contrato + email templates)
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

-- Migration 008: campos de contrato completos (MRR + TCV) e contexto/briefing
alter table clients
  add column if not exists contract_months          integer,
  add column if not exists has_implementation_fee   boolean  default false,
  add column if not exists implementation_fee_value numeric(10,2),
  add column if not exists implementation_fee_date  date,
  add column if not exists project_deadline_days    integer,
  add column if not exists has_installments         boolean  default false,
  add column if not exists installments_type        text,
  add column if not exists installments_count       integer,
  add column if not exists first_installment_date   date,
  add column if not exists parcelas                 jsonb    default '[]'::jsonb,
  add column if not exists nicho_especifico         text,
  add column if not exists resumo_reuniao           text,
  add column if not exists expectativas_cliente     text,
  add column if not exists principais_dores         text;

-- Migration 009: análise semanal de sentimento (analysis_day = dia da semana 0-6)
-- Zera analysis_day para valores válidos antes de mudar a constraint
UPDATE agencies
SET analysis_day = 1
WHERE analysis_day IS NULL OR analysis_day > 6;

ALTER TABLE agencies
  DROP CONSTRAINT IF EXISTS agencies_analysis_day_check;

ALTER TABLE agencies
  ADD CONSTRAINT agencies_analysis_day_weekday
  CHECK (analysis_day BETWEEN 0 AND 6);

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS analysis_nps_day INTEGER NOT NULL DEFAULT 5
  CHECK (analysis_nps_day BETWEEN 1 AND 28);

COMMENT ON COLUMN agencies.analysis_day     IS 'Dia da semana para análise semanal (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb)';
COMMENT ON COLUMN agencies.analysis_nps_day IS 'Dia do mês (1-28) para lembrete de envio do formulário NPS mensal';

-- Migration 010: adiciona tipo 'resend' nas integrações da agência
ALTER TABLE agency_integrations
  DROP CONSTRAINT IF EXISTS agency_integrations_type_check;

ALTER TABLE agency_integrations
  ADD CONSTRAINT agency_integrations_type_check
  CHECK (type IN ('asaas', 'dom_pagamentos', 'evolution_api', 'openai', 'resend'));

-- Migration 011: contrato do cliente + templates de e-mail por agência
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contract_url         text,
  ADD COLUMN IF NOT EXISTS contract_filename    text,
  ADD COLUMN IF NOT EXISTS contract_uploaded_at timestamptz;

CREATE TABLE IF NOT EXISTS agency_email_templates (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  type        text not null,
  subject     text not null,
  body_html   text not null,
  body_text   text,
  updated_at  timestamptz default now(),
  UNIQUE (agency_id, type),
  CHECK (type IN (
    'email_confirmation',
    'form_reminder',
    'nps_form_to_client',
    'analysis_completed',
    'payment_alert',
    'integration_alert'
  ))
);

ALTER TABLE agency_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members can manage their templates" ON agency_email_templates;
CREATE POLICY "agency members can manage their templates"
  ON agency_email_templates
  FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_users WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_templates_agency ON agency_email_templates(agency_id);
