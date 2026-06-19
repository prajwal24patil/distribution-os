create table if not exists public.execution_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  growth_action_id uuid not null references public.growth_actions(id) on delete cascade,
  execution_type text not null default 'manual',
  channel text not null,
  executed_at timestamptz not null default now(),
  executed_by text not null default 'Founder',
  external_url text not null default '',
  notes text not null default '',
  result_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint execution_logs_result_status_check check (
    result_status in ('pending', 'success', 'failed', 'needs_follow_up')
  )
);

alter table public.execution_logs enable row level security;

create policy "Users can read their own execution logs"
  on public.execution_logs
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own execution logs"
  on public.execution_logs
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own execution logs"
  on public.execution_logs
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own execution logs"
  on public.execution_logs
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_execution_logs_updated_at on public.execution_logs;

create trigger set_execution_logs_updated_at
  before update on public.execution_logs
  for each row
  execute function public.set_updated_at();

