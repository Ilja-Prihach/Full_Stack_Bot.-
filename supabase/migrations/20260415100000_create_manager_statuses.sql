create table public.manager_statuses (
  manager_id bigint primary key references public.managers(id) on delete cascade,
  status text not null check (status in ('online', 'away', 'coffee')),
  updated_at timestamptz not null default now()
);

alter table public.manager_statuses enable row level security;

create policy "Managers can read manager statuses"
  on public.manager_statuses for select to authenticated
  using (public.is_manager());

create policy "Managers can insert own manager status"
  on public.manager_statuses for insert to authenticated
  with check (
    public.is_manager()
    and manager_id = (
      select m.id
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

create policy "Managers can update own manager status"
  on public.manager_statuses for update to authenticated
  using (
    public.is_manager()
    and manager_id = (
      select m.id
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_manager()
    and manager_id = (
      select m.id
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'manager_statuses'
  ) then
    execute 'alter publication supabase_realtime add table public.manager_statuses';
  end if;
end
$$;
