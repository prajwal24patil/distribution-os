create table if not exists publishing_connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'reddit', 'facebook', 'instagram', 'youtube', 'blog')),
  connection_status text not null default 'not_connected' check (
    connection_status in ('not_connected', 'connected', 'expired', 'permission_missing', 'disabled')
  ),
  account_name text not null default '',
  account_id text not null default '',
  access_token_encrypted_placeholder text not null default '',
  refresh_token_encrypted_placeholder text not null default '',
  expires_at timestamptz,
  permissions text not null default '',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, owner_id, platform)
);

alter table publishing_connections enable row level security;

create policy "Users can read own publishing connections"
  on publishing_connections for select
  using (auth.uid() = owner_id);

create policy "Users can insert own publishing connections"
  on publishing_connections for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own publishing connections"
  on publishing_connections for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own publishing connections"
  on publishing_connections for delete
  using (auth.uid() = owner_id);

create table if not exists scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  publisher_queue_id uuid not null references publisher_queue(id) on delete cascade,
  platform text not null,
  content_type text not null,
  title text not null,
  content text not null,
  tracking_url text not null default '',
  scheduled_for timestamptz not null,
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'ready' check (
    status in ('ready', 'scheduled', 'publishing', 'published', 'failed', 'skipped', 'manual_required')
  ),
  publish_mode text not null default 'manual_approval' check (
    publish_mode in ('manual_approval', 'official_auto_publish', 'disabled')
  ),
  publish_attempts integer not null default 0,
  published_url text not null default '',
  failure_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, owner_id, publisher_queue_id)
);

alter table scheduled_posts enable row level security;

create policy "Users can read own scheduled posts"
  on scheduled_posts for select
  using (auth.uid() = owner_id);

create policy "Users can insert own scheduled posts"
  on scheduled_posts for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own scheduled posts"
  on scheduled_posts for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own scheduled posts"
  on scheduled_posts for delete
  using (auth.uid() = owner_id);

create table if not exists conversion_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  tracking_link_id uuid references tracking_links(id) on delete set null,
  campaign_item_id uuid references campaign_items(id) on delete set null,
  scheduled_post_id uuid references scheduled_posts(id) on delete set null,
  event_type text not null check (
    event_type in ('click', 'signup', 'resume_upload', 'free_score_generated', 'paid_report', 'referral_share', 'revenue')
  ),
  event_value numeric not null default 0,
  source text not null default '',
  platform text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table conversion_events enable row level security;

create policy "Users can read own conversion events"
  on conversion_events for select
  using (auth.uid() = owner_id);

create policy "Users can insert own conversion events"
  on conversion_events for insert
  with check (auth.uid() = owner_id);

create index if not exists publishing_connections_project_owner_platform_idx
  on publishing_connections(project_id, owner_id, platform);

create index if not exists scheduled_posts_project_owner_status_time_idx
  on scheduled_posts(project_id, owner_id, status, scheduled_for);

create index if not exists scheduled_posts_project_owner_platform_time_idx
  on scheduled_posts(project_id, owner_id, platform, scheduled_for);

create index if not exists publisher_queue_project_owner_status_platform_idx
  on publisher_queue(project_id, owner_id, status, platform);

create index if not exists conversion_events_project_owner_time_idx
  on conversion_events(project_id, owner_id, occurred_at);

create index if not exists conversion_events_tracking_link_idx
  on conversion_events(tracking_link_id);
