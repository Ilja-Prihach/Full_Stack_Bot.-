create table public.client_read_states (
  id bigint primary key generated always as identity,
  client_id bigint not null references public.clients(id) on delete cascade,
  manager_id bigint not null references public.managers(id) on delete cascade,
  last_read_message_id bigint references public.messages(id) on delete set null,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, manager_id)
);

create index client_read_states_manager_id_idx
  on public.client_read_states (manager_id);

create index client_read_states_client_id_idx
  on public.client_read_states (client_id);

alter table public.client_read_states enable row level security;

create policy "Managers can read client read states" on public.client_read_states
  for select
  using (public.is_manager());

create policy "Managers can insert client read states" on public.client_read_states
  for insert
  with check (public.is_manager());

create policy "Managers can update client read states" on public.client_read_states
  for update
  using (public.is_manager())
  with check (public.is_manager());
