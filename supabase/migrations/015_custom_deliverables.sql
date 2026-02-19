-- Migration 015: Permitir entregáveis e bônus personalizados por cliente
-- Além dos entregáveis do produto padrão, o cliente pode ter itens extras personalizados

alter table clients
  add column if not exists entregaveis_customizados jsonb default '[]'::jsonb,
  add column if not exists bonus_customizados       jsonb default '[]'::jsonb;

comment on column clients.entregaveis_customizados is 'Array de entregáveis extras não presentes no produto padrão. Formato: [{id: string, name: string}]';
comment on column clients.bonus_customizados is 'Array de bônus extras não presentes no produto padrão. Formato: [{id: string, name: string}]';
