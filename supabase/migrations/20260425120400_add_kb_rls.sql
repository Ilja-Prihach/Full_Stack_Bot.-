alter table public.kb_categories enable row level security;
alter table public.kb_entries enable row level security;
alter table public.kb_embeddings enable row level security;
alter table public.ai_daily_usage enable row level security;
alter table public.ai_reply_events enable row level security;

create policy "Managers can read kb_categories" on public.kb_categories
  for select
  using (public.is_manager());

create policy "Managers can insert kb_categories" on public.kb_categories
  for insert
  with check (public.is_manager());

create policy "Managers can update kb_categories" on public.kb_categories
  for update
  using (public.is_manager())
  with check (public.is_manager());

create policy "Managers can read kb_entries" on public.kb_entries
  for select
  using (public.is_manager());

create policy "Managers can insert kb_entries" on public.kb_entries
  for insert
  with check (public.is_manager());

create policy "Managers can update kb_entries" on public.kb_entries
  for update
  using (public.is_manager())
  with check (public.is_manager());

create policy "Managers can delete kb_entries" on public.kb_entries
  for delete
  using (public.is_manager());

create policy "Managers can read kb_embeddings" on public.kb_embeddings
  for select
  using (public.is_manager());

create policy "Managers can insert kb_embeddings" on public.kb_embeddings
  for insert
  with check (public.is_manager());

create policy "Managers can update kb_embeddings" on public.kb_embeddings
  for update
  using (public.is_manager())
  with check (public.is_manager());

create policy "Managers can delete kb_embeddings" on public.kb_embeddings
  for delete
  using (public.is_manager());

create policy "Managers can read ai_daily_usage" on public.ai_daily_usage
  for select
  using (public.is_manager());

create policy "Managers can read ai_reply_events" on public.ai_reply_events
  for select
  using (public.is_manager());
