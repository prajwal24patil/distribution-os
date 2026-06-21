create table if not exists distribution_cycles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  cycle_type text not null default 'manual' check (cycle_type in ('manual', 'daily', 'weekly')),
  status text not null default 'completed' check (status in ('running', 'completed', 'failed', 'paused')),
  product_url text not null default '',
  strategy_summary text not null default '',
  channels_selected text not null default '',
  content_created_count integer not null default 0,
  content_approved_count integer not null default 0,
  content_rejected_count integer not null default 0,
  published_count integer not null default 0,
  queued_count integer not null default 0,
  clicks integer not null default 0,
  signups integer not null default 0,
  paid_users integer not null default 0,
  revenue numeric not null default 0,
  learning_summary text not null default '',
  next_cycle_plan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table product_memory
  add column if not exists product_url text not null default '',
  add column if not exists product_goal text not null default '',
  add column if not exists target_audience text not null default '',
  add column if not exists offer text not null default '',
  add column if not exists primary_cta text not null default '',
  add column if not exists brand_tone text not null default '',
  add column if not exists allowed_channels text not null default '',
  add column if not exists publishing_mode text not null default 'manual_approval'
    check (publishing_mode in ('manual_approval', 'official_auto_publish_ready', 'paused'));

alter table publisher_queue
  add column if not exists asset_type text not null default '',
  add column if not exists format text not null default '',
  add column if not exists short_video_script text not null default '',
  add column if not exists blog_outline text not null default '',
  add column if not exists caption text not null default '',
  add column if not exists landing_copy text not null default '',
  add column if not exists referral_copy text not null default '',
  add column if not exists quality_score integer not null default 0,
  add column if not exists qa_status text not null default 'pending',
  add column if not exists qa_reason text not null default '',
  add column if not exists predicted_rank_score integer not null default 0,
  add column if not exists publishing_status text not null default 'manual_approval_required',
  add column if not exists published_url text not null default '',
  add column if not exists result_summary text not null default '';

create index if not exists distribution_cycles_project_created_idx
  on distribution_cycles(project_id, created_at desc);

alter table distribution_cycles enable row level security;

drop policy if exists "distribution_cycles_select_own" on distribution_cycles;
create policy "distribution_cycles_select_own"
  on distribution_cycles for select
  using (auth.uid() = owner_id);

drop policy if exists "distribution_cycles_insert_own" on distribution_cycles;
create policy "distribution_cycles_insert_own"
  on distribution_cycles for insert
  with check (auth.uid() = owner_id);

drop policy if exists "distribution_cycles_update_own" on distribution_cycles;
create policy "distribution_cycles_update_own"
  on distribution_cycles for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "distribution_cycles_delete_own" on distribution_cycles;
create policy "distribution_cycles_delete_own"
  on distribution_cycles for delete
  using (auth.uid() = owner_id);
