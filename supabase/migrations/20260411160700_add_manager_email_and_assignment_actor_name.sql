alter table public.managers
  add column email text;

update public.managers m
set email = u.email
from auth.users u
where u.id = m.auth_user_id
  and m.email is null;

do $$
begin
  if exists (
    select 1
    from public.managers
    where email is null
  ) then
    raise exception 'Cannot enforce managers.email: some manager rows still have null email';
  end if;
end
$$;

alter table public.managers
  alter column email set not null;

alter table public.managers
  add constraint managers_email_key unique (email);

alter table public.client_assignments
  add column last_reassigned_by_manager_name varchar(255);
