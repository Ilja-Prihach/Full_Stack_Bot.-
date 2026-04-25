create table public.kb_categories (
  id bigint primary key generated always as identity,
  name varchar(255) not null,
  description text,
  created_at timestamptz not null default now(),

  constraint kb_categories_name_not_blank_check
    check (length(btrim(name)) > 0)
);

create table public.kb_entries (
  id bigint primary key generated always as identity,
  category_id bigint references public.kb_categories(id) on delete set null,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  status text not null default 'embedding_pending',
  is_active boolean not null default true,
  created_by_manager_id bigint references public.managers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint kb_entries_question_not_blank_check
    check (length(btrim(question)) > 0),
  constraint kb_entries_answer_not_blank_check
    check (length(btrim(answer)) > 0),
  constraint kb_entries_status_check
    check (
      status in (
        'draft',
        'embedding_pending',
        'embedding_ready',
        'embedding_failed'
      )
    )
);

create table public.kb_embeddings (
  id bigint primary key generated always as identity,
  kb_entry_id bigint not null references public.kb_entries(id) on delete cascade,
  content_hash text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),

  constraint kb_embeddings_kb_entry_id_unique unique (kb_entry_id)
);

create index kb_entries_category_id_idx
  on public.kb_entries(category_id);

create index kb_entries_is_active_idx
  on public.kb_entries(is_active);

create index kb_entries_status_idx
  on public.kb_entries(status);

create index kb_embeddings_embedding_hnsw_idx
  on public.kb_embeddings
  using hnsw (embedding vector_cosine_ops);
