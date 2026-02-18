-- Migration 011: contrato do cliente + templates de e-mail por agência

-- 1. Coluna para URL do contrato PDF na tabela clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contract_url      text,
  ADD COLUMN IF NOT EXISTS contract_filename text,
  ADD COLUMN IF NOT EXISTS contract_uploaded_at timestamptz;

-- 2. Tabela de templates de e-mail personalizados por agência
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

CREATE POLICY "agency members can manage their templates"
  ON agency_email_templates
  FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_users WHERE user_id = auth.uid()
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_email_templates_agency ON agency_email_templates(agency_id);
