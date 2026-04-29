alter table public.client_assignments
  add column priority_mode text not null default 'auto',
  add column manual_priority_label text;

alter table public.client_assignments
  add constraint client_assignments_priority_mode_check
    check (
      priority_mode in (
        'auto',
        'manual'
      )
    ),
  add constraint client_assignments_manual_priority_label_check
    check (
      manual_priority_label is null
      or manual_priority_label in (
        'high',
        'medium',
        'low'
      )
    );

update public.client_assignments
set
  priority_mode = 'auto',
  manual_priority_label = null
where true;

create index client_assignments_priority_mode_idx
  on public.client_assignments(priority_mode);

create index client_assignments_manual_priority_label_idx
  on public.client_assignments(manual_priority_label);
