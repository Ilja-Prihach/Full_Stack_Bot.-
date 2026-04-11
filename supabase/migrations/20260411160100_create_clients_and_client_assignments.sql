create table public.clients (
  id bigint primary key generated always as identity,
  telegram_user_id bigint not null unique,
  telegram_chat_id bigint not null unique,
  username varchar(32),
  first_name varchar(64),
  last_name varchar(64),
  created_at timestamptz not null default now()
);

create table public.client_assignments (
  id bigint primary key generated always as identity,
  client_id bigint not null unique references public.clients(id) on delete restrict,
  assigned_manager_id bigint references public.managers(id) on delete set null,
  previous_manager_id bigint references public.managers(id) on delete set null,
  last_reassigned_by_manager_id bigint references public.managers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
