create table public.managers (
  id bigint primary key generated always as identity,
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  first_name varchar(255) not null,
  last_name varchar(255) not null,
  position varchar(255) not null,
  created_at timestamptz not null default now()
);
