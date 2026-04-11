insert into public.managers (
  auth_user_id,
  first_name,
  last_name,
  position
)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'first_name', ''), 'Admin'),
  coalesce(nullif(u.raw_user_meta_data->>'last_name', ''), 'User'),
  'Менеджер'
from auth.users u
on conflict (auth_user_id) do nothing;
