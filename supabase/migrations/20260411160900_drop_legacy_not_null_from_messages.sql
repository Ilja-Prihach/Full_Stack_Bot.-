alter table public.messages
  alter column chat_id drop not null,
  alter column user_id drop not null;
