create table public.messages (
  id bigint primary key generated always as identity,
  chat_id bigint not null,
  user_id bigint not null,
  username varchar(255),
  first_name varchar(255),
  last_name varchar(255),
  text text not null,
  created_at timestamptz not null default now()
);
