update public.client_assignments
set
  workflow_status = 'completed',
  status_updated_at = now(),
  updated_at = now()
where workflow_status = 'waiting_client';

alter table public.client_assignments
  drop constraint if exists client_assignments_workflow_status_check;

alter table public.client_assignments
  add constraint client_assignments_workflow_status_check
    check (
      workflow_status in (
        'new',
        'in_progress',
        'completed'
      )
    );
