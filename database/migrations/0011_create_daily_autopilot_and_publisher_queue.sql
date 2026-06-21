create table if not exists public.daily_autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  run_date date not null default current_date,
  status text not null default 'completed',
  problem_found text not null,
  fix_applied text not null,
  work_created_count integer not null default 0,
  next_step text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_autopilot_runs_status_check check (
    status in ('completed', 'skipped', 'failed')
  ),
  constraint daily_autopilot_runs_work_count_check check (work_created_count >= 0),
  constraint daily_autopilot_runs_unique_day unique (project_id, owner_id, run_date)
);

create table if not exists public.publisher_queue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_item_id uuid references public.campaign_items(id) on delete set null,
  platform text not null,
  content_type text not null,
  title text not null,
  content text not null,
  tracking_url text not null default '',
  status text not null default 'draft',
  scheduled_for timestamptz,
  posted_url text not null default '',
  result_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publisher_queue_status_check check (
    status in ('draft', 'ready_for_approval', 'approved', 'scheduled_manual', 'posted', 'failed')
  )
);

alter table public.daily_autopilot_runs enable row level security;
alter table public.publisher_queue enable row level security;

create policy "Users can read their own daily autopilot runs"
  on public.daily_autopilot_runs
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own daily autopilot runs"
  on public.daily_autopilot_runs
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own daily autopilot runs"
  on public.daily_autopilot_runs
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own daily autopilot runs"
  on public.daily_autopilot_runs
  for delete
  using (auth.uid() = owner_id);

create policy "Users can read their own publisher queue"
  on public.publisher_queue
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own publisher queue"
  on public.publisher_queue
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own publisher queue"
  on public.publisher_queue
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own publisher queue"
  on public.publisher_queue
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_daily_autopilot_runs_updated_at on public.daily_autopilot_runs;
create trigger set_daily_autopilot_runs_updated_at
  before update on public.daily_autopilot_runs
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_publisher_queue_updated_at on public.publisher_queue;
create trigger set_publisher_queue_updated_at
  before update on public.publisher_queue
  for each row
  execute function public.set_updated_at();
