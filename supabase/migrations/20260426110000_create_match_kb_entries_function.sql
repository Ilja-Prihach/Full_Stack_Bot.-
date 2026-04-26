create or replace function public.match_kb_entries(
  query_embedding_text text,
  match_count integer default 3
)
returns table (
  kb_entry_id bigint,
  question text,
  answer text,
  keywords text[],
  is_active boolean,
  similarity double precision
)
language sql
stable
as $$
  select
    e.id as kb_entry_id,
    e.question,
    e.answer,
    e.keywords,
    e.is_active,
    1 - (emb.embedding <=> query_embedding_text::vector) as similarity
  from public.kb_embeddings emb
  join public.kb_entries e
    on e.id = emb.kb_entry_id
  where e.is_active = true
    and e.status = 'embedding_ready'
  order by emb.embedding <=> query_embedding_text::vector
  limit greatest(match_count, 1)
$$;
