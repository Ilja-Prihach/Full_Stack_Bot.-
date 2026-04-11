alter table public.messages
  add column client_id bigint references public.clients(id) on delete restrict;

insert into public.clients (
  telegram_user_id,
  telegram_chat_id,
  username,
  first_name,
  last_name,
  created_at
)
select distinct on (m.chat_id)
  m.user_id as telegram_user_id,
  m.chat_id as telegram_chat_id,
  m.username,
  m.first_name,
  m.last_name,
  min(m.created_at) over (partition by m.chat_id) as created_at
from public.messages m
order by m.chat_id, m.created_at desc;

update public.messages m
set client_id = c.id
from public.clients c
where c.telegram_chat_id = m.chat_id
  and c.telegram_user_id = m.user_id;

do $$
begin
  if exists (
    select 1
    from public.messages
    where client_id is null
  ) then
    raise exception 'Backfill failed: some messages still have null client_id';
  end if;
end
$$;
