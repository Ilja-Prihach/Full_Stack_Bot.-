alter table public.messages
  drop constraint if exists messages_sender_type_check;

alter table public.messages
  drop constraint if exists messages_sender_manager_consistency_check;

alter table public.messages
  add constraint messages_sender_type_check
    check (sender_type in ('client', 'manager', 'ai_bot'));

alter table public.messages
  add constraint messages_sender_manager_consistency_check
    check (
      (sender_type = 'client' and sender_manager_id is null)
      or (sender_type = 'manager' and sender_manager_id is not null)
      or (sender_type = 'ai_bot' and sender_manager_id is null)
    );
