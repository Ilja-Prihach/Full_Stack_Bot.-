-- Создаёт менеджера автоматически при добавлении пользователя в auth.users
create or replace function public.auto_seed_manager()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.managers (auth_user_id, first_name, last_name, position, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), 'Admin'),
    coalesce(nullif(new.raw_user_meta_data->>'last_name', ''), 'User'),
    'Менеджер',
    new.email
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

-- Привязываем триггер к auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.auto_seed_manager();

-- Создаём менеджеров для уже существующих пользователей без записи
insert into public.managers (auth_user_id, first_name, last_name, position, email)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'first_name', ''), 'Admin'),
  coalesce(nullif(u.raw_user_meta_data->>'last_name', ''), 'User'),
  'Менеджер',
  u.email
from auth.users u
where not exists (select 1 from public.managers m where m.auth_user_id = u.id);
