# SupportBot ERD

This folder contains ERD diagrams derived from `supabase/migrations`.

Files:

- `01-supabase-schema.puml` - current database schema including client messages, team chat, read states, assignments, and manager availability statuses

Source migrations:

- `supabase/migrations/20260319180145_create_messages_table.sql`
- `supabase/migrations/20260324120000_add_rls_to_messages.sql`
- `supabase/migrations/20260411160000_create_managers_table.sql`
- `supabase/migrations/20260411160100_create_clients_and_client_assignments.sql`
- `supabase/migrations/20260412120000_create_client_read_states.sql`
- `supabase/migrations/20260414120000_create_team_messages.sql`
- `supabase/migrations/20260414120100_create_team_read_states.sql`
- `supabase/migrations/20260415100000_create_manager_statuses.sql`
