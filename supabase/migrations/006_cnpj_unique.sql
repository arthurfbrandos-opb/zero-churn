-- Migration 006: CNPJ único por agência
-- Partial index — só quando cnpj não é nulo/vazio
-- Seguro re-executar (IF NOT EXISTS)

CREATE UNIQUE INDEX IF NOT EXISTS clients_agency_cnpj_unique
  ON clients (agency_id, cnpj)
  WHERE cnpj IS NOT NULL AND cnpj != '';
