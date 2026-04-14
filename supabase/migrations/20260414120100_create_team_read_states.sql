create table public.team_read_states (
  id bigint generated always as identity primary key,
  manager_id bigint not null references public.managers(id) on delete cascade,
  last_read_message_id bigint references public.team_messages(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint team_read_states_manager_unique unique (manager_id)
);

alter table public.team_read_states enable row level security;

create policy "Managers can read team read states"
  on public.team_read_states for select to authenticated
  using (public.is_manager());

create policy "Managers can insert team read states"
  on public.team_read_states for insert to authenticated
  with check (public.is_manager());

create policy "Managers can update team read states"
  on public.team_read_states for update to authenticated
  using (public.is_manager());
