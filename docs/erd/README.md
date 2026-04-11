# SupportBot ERD

This folder contains ERD diagrams derived from `supabase/migrations`
and planned schema additions agreed before writing migrations.

Files:

- `01-supabase-schema.puml` - current database schema in Supabase
  plus planned `public.managers` table linked to `auth.users`

Source migrations:

- `supabase/migrations/20260319180145_create_messages_table.sql`
- `supabase/migrations/20260324120000_add_rls_to_messages.sql`
