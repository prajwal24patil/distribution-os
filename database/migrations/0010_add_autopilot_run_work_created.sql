alter table public.autopilot_runs
  add column if not exists work_created text not null default '';
