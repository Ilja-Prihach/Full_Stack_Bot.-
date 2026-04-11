create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.managers m
    where m.auth_user_id = auth.uid()
  );
$$;

drop policy if exists "Managers can read clients" on public.clients;
drop policy if exists "Managers can update clients" on public.clients;
drop policy if exists "Managers can read managers" on public.managers;
drop policy if exists "Managers can read assignments" on public.client_assignments;
drop policy if exists "Managers can insert assignments" on public.client_assignments;
drop policy if exists "Managers can update assignments" on public.client_assignments;
drop policy if exists "Managers can read messages" on public.messages;
drop policy if exists "Managers can insert messages" on public.messages;

create policy "Managers can read clients" on public.clients
  for select
  using (public.is_manager());

create policy "Managers can update clients" on public.clients
  for update
  using (public.is_manager())
  with check (public.is_manager());

create policy "Managers can read managers" on public.managers
  for select
  using (public.is_manager());

create policy "Managers can read assignments" on public.client_assignments
  for select
  using (public.is_manager());

create policy "Managers can insert assignments" on public.client_assignments
  for insert
  with check (public.is_manager());

create policy "Managers can update assignments" on public.client_assignments
  for update
  using (public.is_manager())
  with check (public.is_manager());

create policy "Managers can read messages" on public.messages
  for select
  using (public.is_manager());

create policy "Managers can insert messages" on public.messages
  for insert
  with check (public.is_manager());
