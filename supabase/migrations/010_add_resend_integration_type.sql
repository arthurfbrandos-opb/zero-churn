-- Migration 010: adiciona 'resend' ao CHECK constraint de agency_integrations.type
--
-- O constraint original só permitia: asaas, dom_pagamentos, evolution_api, openai
-- Precisamos adicionar 'resend' para suportar integração de e-mail por agência.
--
-- Como o Postgres não tem ALTER CONSTRAINT, o processo é:
--   1. Dropar o constraint antigo
--   2. Recriar com os valores atualizados

ALTER TABLE agency_integrations
  DROP CONSTRAINT IF EXISTS agency_integrations_type_check;

ALTER TABLE agency_integrations
  ADD CONSTRAINT agency_integrations_type_check
  CHECK (type IN ('asaas', 'dom_pagamentos', 'evolution_api', 'openai', 'resend'));
