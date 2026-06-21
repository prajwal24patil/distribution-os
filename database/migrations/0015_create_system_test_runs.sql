create table if not exists system_test_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pass', 'fail', 'warning')),
  total_tests integer not null default 0,
  passed integer not null default 0,
  failed integer not null default 0,
  warnings integer not null default 0,
  summary text not null default '',
  results_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table system_test_runs enable row level security;

create policy "Users can read own system test runs"
  on system_test_runs for select
  using (auth.uid() = owner_id);

create policy "Users can insert own system test runs"
  on system_test_runs for insert
  with check (auth.uid() = owner_id);

create policy "Users can delete own system test runs"
  on system_test_runs for delete
  using (auth.uid() = owner_id);

create index if not exists system_test_runs_project_owner_created_idx
  on system_test_runs(project_id, owner_id, created_at desc);
