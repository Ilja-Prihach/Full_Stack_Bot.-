do $$
begin
  if exists (
    select 1
    from public.messages
    where client_id is null
      or sender_type is null
      or sender_label is null
  ) then
    raise exception 'Cannot enforce messages sender fields: null values still exist';
  end if;
end
$$;

alter table public.messages
  alter column client_id set not null,
  alter column sender_type set not null,
  alter column sender_label set not null;
