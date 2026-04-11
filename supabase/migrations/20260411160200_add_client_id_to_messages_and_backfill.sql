alter table public.messages
  add column client_id bigint references public.clients(id) on delete restrict,
  add column sender_type text,
  add column sender_manager_id bigint references public.managers(id) on delete set null,
  add column sender_label varchar(255);

do $$
begin
  if exists (
    select 1
    from public.messages
    group by chat_id
    having count(distinct user_id) > 1
  ) then
    raise exception 'Backfill aborted: one chat_id maps to multiple user_id values';
  end if;

  if exists (
    select 1
    from public.messages
    group by user_id
    having count(distinct chat_id) > 1
  ) then
    raise exception 'Backfill aborted: one user_id maps to multiple chat_id values';
  end if;
end
$$;

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
set client_id = c.id,
    sender_type = 'client',
    sender_manager_id = null,
    sender_label = coalesce(nullif(m.username, ''), nullif(m.first_name, ''), 'Клиент')
from public.clients c
where c.telegram_chat_id = m.chat_id
  and c.telegram_user_id = m.user_id;

alter table public.messages
  add constraint messages_sender_type_check
    check (sender_type in ('client', 'manager')),
  add constraint messages_sender_manager_consistency_check
    check (
      (sender_type = 'client' and sender_manager_id is null)
      or (sender_type = 'manager' and sender_manager_id is not null)
    ),
  add constraint messages_sender_label_not_blank_check
    check (length(btrim(sender_label)) > 0);

do $$
begin
  if exists (
    select 1
    from public.messages
    where client_id is null
      or sender_type is null
      or sender_label is null
  ) then
    raise exception 'Backfill failed: some messages still have null client_id, sender_type, or sender_label';
  end if;
end
$$;
