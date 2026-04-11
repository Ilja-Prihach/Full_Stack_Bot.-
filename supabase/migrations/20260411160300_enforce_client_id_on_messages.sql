do $$
begin
  if exists (
    select 1
    from public.messages
    where client_id is null
  ) then
    raise exception 'Cannot set NOT NULL on messages.client_id: null values still exist';
  end if;
end
$$;

alter table public.messages
  alter column client_id set not null;
