-- Zero Churn - Fix: dependencia circular no RLS
-- O problema: get_agency_id() le agency_users,
-- mas agency_users tem RLS que chama get_agency_id() -> loop infinito
-- Execute no SQL Editor do Supabase

-- 1. Recria get_agency_id() com SECURITY DEFINER
--    (roda como dono da funcao, bypassa RLS ao ler agency_users)
create or replace function get_agency_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select agency_id
  from agency_users
  where user_id = auth.uid()
  limit 1;
$$;

-- 2. Corrige a policy de agency_users para nao criar loop:
--    um usuario ve suas proprias linhas diretamente via user_id
drop policy if exists "Ver membros da agencia" on agency_users;
create policy "Ver membros da agencia"
  on agency_users for select
  using (user_id = auth.uid());
