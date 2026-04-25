create table public.ai_daily_usage (
  usage_date date not null,
  client_id bigint not null references public.clients(id) on delete cascade,
  reply_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (usage_date, client_id),

  constraint ai_daily_usage_reply_count_non_negative_check
    check (reply_count >= 0)
);

create table public.ai_reply_events (
  id bigint primary key generated always as identity,
  client_id bigint not null references public.clients(id) on delete cascade,
  source_message_id bigint references public.messages(id) on delete set null,
  reply_type text not null,
  decision text not null,
  confidence double precision,
  kb_entry_ids jsonb not null default '[]'::jsonb,
  message_text text,
  reply_text text,
  created_at timestamptz not null default now(),

  constraint ai_reply_events_reply_type_check
    check (
      reply_type in (
        'greeting',
        'answer',
        'fallback',
        'none'
      )
    ),
  constraint ai_reply_events_decision_not_blank_check
    check (length(btrim(decision)) > 0)
);

create index ai_reply_events_client_id_created_at_idx
  on public.ai_reply_events(client_id, created_at desc);
