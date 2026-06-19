alter table public.execution_logs
  add column if not exists result_metric text not null default '',
  add column if not exists result_value text not null default '',
  add column if not exists learning text not null default '',
  add column if not exists completed_at timestamptz;

alter table public.projects
  add column if not exists next_recommendation text not null default '';
