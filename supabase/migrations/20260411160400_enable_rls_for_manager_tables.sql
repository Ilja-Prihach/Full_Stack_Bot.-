alter table public.clients enable row level security;
alter table public.managers enable row level security;
alter table public.client_assignments enable row level security;

create policy "Managers can read clients" on public.clients
  for select
  using (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

create policy "Managers can update clients" on public.clients
  for update
  using (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

create policy "Managers can read managers" on public.managers
  for select
  using (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

create policy "Managers can read assignments" on public.client_assignments
  for select
  using (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

create policy "Managers can insert assignments" on public.client_assignments
  for insert
  with check (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

create policy "Managers can update assignments" on public.client_assignments
  for update
  using (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );
