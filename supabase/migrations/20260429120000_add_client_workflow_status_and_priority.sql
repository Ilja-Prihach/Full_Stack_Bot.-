alter table public.client_assignments
  add column workflow_status text not null default 'new',
  add column priority_score integer not null default 0,
  add column priority_label text not null default 'low',
  add column priority_reason text,
  add column last_client_message_at timestamptz,
  add column last_manager_message_at timestamptz,
  add column status_updated_at timestamptz not null default now(),
  add column priority_updated_at timestamptz not null default now();

alter table public.client_assignments
  add constraint client_assignments_workflow_status_check
    check (
      workflow_status in (
        'new',
        'in_progress',
        'waiting_client',
        'completed'
      )
    ),
  add constraint client_assignments_priority_label_check
    check (
      priority_label in (
        'high',
        'medium',
        'low'
      )
    ),
  add constraint client_assignments_priority_score_non_negative_check
    check (priority_score >= 0);

create index client_assignments_workflow_status_idx
  on public.client_assignments(workflow_status);

create index client_assignments_priority_label_idx
  on public.client_assignments(priority_label);

create index client_assignments_priority_score_desc_idx
  on public.client_assignments(priority_score desc);

create index client_assignments_last_client_message_at_desc_idx
  on public.client_assignments(last_client_message_at desc);

create index client_assignments_assigned_manager_id_idx
  on public.client_assignments(assigned_manager_id);

with message_stats as (
  select
    m.client_id,
    max(m.created_at) filter (where m.sender_type = 'client') as last_client_message_at,
    max(m.created_at) filter (where m.sender_type = 'manager') as last_manager_message_at,
    count(*) filter (where m.sender_type = 'client') as client_message_count
  from public.messages m
  group by m.client_id
),
last_ai_events as (
  select distinct on (e.client_id)
    e.client_id,
    e.decision,
    e.created_at
  from public.ai_reply_events e
  order by e.client_id, e.created_at desc
),
backfill as (
  select
    ca.client_id,
    ms.last_client_message_at,
    ms.last_manager_message_at,
    case
      when ca.ai_auto_reply_enabled = false then 'in_progress'
      else 'new'
    end as workflow_status,
    case
      when lae.decision = 'manager_request_sent' then 55
      when lae.decision = 'no_match' then 40
      when coalesce(ms.client_message_count, 0) >= 2 then 35
      when ms.last_client_message_at is not null then 30
      else 0
    end as priority_score,
    case
      when lae.decision = 'manager_request_sent' then 'Запросил менеджера'
      when lae.decision = 'no_match' then 'AI не нашёл ответ'
      when coalesce(ms.client_message_count, 0) >= 2 then 'Повторные сообщения'
      when ms.last_client_message_at is not null then 'Новый диалог'
      else null
    end as priority_reason
  from public.client_assignments ca
  left join message_stats ms
    on ms.client_id = ca.client_id
  left join last_ai_events lae
    on lae.client_id = ca.client_id
)
update public.client_assignments ca
set
  workflow_status = b.workflow_status,
  priority_score = b.priority_score,
  priority_label = case
    when b.priority_score >= 70 then 'high'
    when b.priority_score >= 35 then 'medium'
    else 'low'
  end,
  priority_reason = b.priority_reason,
  last_client_message_at = b.last_client_message_at,
  last_manager_message_at = b.last_manager_message_at,
  status_updated_at = now(),
  priority_updated_at = now()
from backfill b
where b.client_id = ca.client_id;
