-- Migration 008: campos de contrato completos (MRR + TCV) e contexto/briefing
alter table clients
  -- MRR
  add column if not exists contract_months          integer,
  add column if not exists has_implementation_fee   boolean  default false,
  add column if not exists implementation_fee_value numeric(10,2),
  add column if not exists implementation_fee_date  date,
  -- TCV
  add column if not exists project_deadline_days    integer,
  add column if not exists has_installments         boolean  default false,
  add column if not exists installments_type        text,
  add column if not exists installments_count       integer,
  add column if not exists first_installment_date   date,
  add column if not exists parcelas                 jsonb    default '[]'::jsonb,
  -- Contexto / Briefing
  add column if not exists nicho_especifico         text,
  add column if not exists resumo_reuniao           text,
  add column if not exists expectativas_cliente     text,
  add column if not exists principais_dores         text;
