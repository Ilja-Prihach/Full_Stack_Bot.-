create table public.team_messages (
  id bigint generated always as identity primary key,
  sender_id bigint not null references public.managers(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.team_messages enable row level security;

create policy "Managers can read team messages"
  on public.team_messages for select to authenticated
  using (public.is_manager());

create policy "Managers can insert team messages"
  on public.team_messages for insert to authenticated
  with check (public.is_manager());

alter publication supabase_realtime add table public.team_messages;
