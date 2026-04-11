drop policy if exists "Allow public read" on public.messages;

create policy "Managers can read messages" on public.messages
  for select
  using (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );

create policy "Managers can insert messages" on public.messages
  for insert
  with check (
    exists (
      select 1
      from public.managers m
      where m.auth_user_id = auth.uid()
    )
  );
