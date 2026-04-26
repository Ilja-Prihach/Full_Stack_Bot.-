alter table public.client_assignments
  add column ai_auto_reply_enabled boolean not null default true;
