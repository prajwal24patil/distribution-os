create table if not exists public.autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  detected_problem text not null,
  applied_fix text not null,
  work_created text not null default '',
  next_step text not null,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint autopilot_runs_status_check check (status in ('ready', 'needs_input', 'applied'))
);

alter table public.autopilot_runs enable row level security;

create policy "Users can read their own autopilot runs"
  on public.autopilot_runs
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own autopilot runs"
  on public.autopilot_runs
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own autopilot runs"
  on public.autopilot_runs
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own autopilot runs"
  on public.autopilot_runs
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_autopilot_runs_updated_at on public.autopilot_runs;
create trigger set_autopilot_runs_updated_at
  before update on public.autopilot_runs
  for each row
  execute function public.set_updated_at();
