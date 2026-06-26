alter table publishing_connections
  drop constraint if exists publishing_connections_platform_check;

alter table publishing_connections
  add constraint publishing_connections_platform_check
  check (
    platform in (
      'blog',
      'linkedin',
      'x',
      'google_business_profile',
      'reddit',
      'facebook_page',
      'instagram_business',
      'youtube',
      'whatsapp_manual',
      'quora_manual',
      'email_manual'
    )
  );

alter table publishing_connections
  drop constraint if exists publishing_connections_connection_status_check;

alter table publishing_connections
  add constraint publishing_connections_connection_status_check
  check (
    connection_status in (
      'not_connected',
      'connected',
      'expired',
      'permission_missing',
      'manual_required',
      'integration_not_ready',
      'rate_limited',
      'disabled'
    )
  );

alter table publishing_connections
  add column if not exists token_reference text not null default '',
  add column if not exists refresh_token_reference text not null default '',
  add column if not exists token_expires_at timestamptz,
  add column if not exists scopes text not null default '',
  add column if not exists last_error text not null default '';

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'healthy' check (status in ('healthy', 'degraded', 'recovered', 'warning', 'failed')),
  agents_started int not null default 0,
  agents_completed int not null default 0,
  agents_failed int not null default 0,
  recovered_issues text not null default '',
  warnings text not null default '',
  manual_actions_needed text not null default '',
  next_safe_action text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references agent_runs(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  agent_name text not null,
  status text not null default 'completed',
  safe_error_message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists agent_health_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  check_name text not null,
  status text not null default 'pass',
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists agent_recovery_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_agent text not null,
  issue text not null,
  recovery_action text not null,
  status text not null default 'recovered',
  created_at timestamptz not null default now()
);

create table if not exists revenue_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  audience text not null,
  pain text not null,
  offer text not null,
  hook text not null,
  cta text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists social_share_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revenue_campaign_id uuid references revenue_campaigns(id) on delete set null,
  platform text not null,
  asset_type text not null,
  audience text not null default '',
  hook text not null default '',
  cta text not null default '',
  content text not null,
  tracking_link text not null default '',
  qc_status text not null default 'qc_pending',
  publish_decision text not null default 'manual_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists social_publish_queue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  campaign_id uuid,
  asset_id uuid,
  platform text not null,
  status text not null default 'draft' check (
    status in (
      'draft',
      'qc_pending',
      'approved',
      'scheduled',
      'publishing',
      'published',
      'failed',
      'retry_scheduled',
      'manual_required',
      'manual_review_required',
      'blocked'
    )
  ),
  scheduled_for timestamptz,
  attempt_count int not null default 0,
  max_attempts int not null default 3,
  last_attempt_at timestamptz,
  published_at timestamptz,
  published_url text not null default '',
  tracking_link text not null default '',
  error_code text not null default '',
  safe_error_message text not null default '',
  requires_manual_action boolean not null default true,
  manual_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table agent_runs enable row level security;
alter table agent_run_steps enable row level security;
alter table agent_health_checks enable row level security;
alter table agent_recovery_events enable row level security;
alter table revenue_campaigns enable row level security;
alter table social_share_assets enable row level security;
alter table social_publish_queue enable row level security;

drop policy if exists agent_runs_owner_select on agent_runs;
create policy agent_runs_owner_select on agent_runs for select using (auth.uid() = owner_id);

drop policy if exists agent_run_steps_owner_select on agent_run_steps;
create policy agent_run_steps_owner_select on agent_run_steps for select using (auth.uid() = owner_id);

drop policy if exists agent_health_checks_owner_select on agent_health_checks;
create policy agent_health_checks_owner_select on agent_health_checks for select using (auth.uid() = owner_id);

drop policy if exists agent_recovery_events_owner_select on agent_recovery_events;
create policy agent_recovery_events_owner_select on agent_recovery_events for select using (auth.uid() = owner_id);

drop policy if exists revenue_campaigns_owner_select on revenue_campaigns;
create policy revenue_campaigns_owner_select on revenue_campaigns for select using (auth.uid() = owner_id);

drop policy if exists social_share_assets_owner_select on social_share_assets;
create policy social_share_assets_owner_select on social_share_assets for select using (auth.uid() = owner_id);

drop policy if exists social_publish_queue_owner_select on social_publish_queue;
create policy social_publish_queue_owner_select on social_publish_queue for select using (auth.uid() = owner_id);

drop policy if exists agent_runs_owner_all on agent_runs;
create policy agent_runs_owner_all on agent_runs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists agent_run_steps_owner_all on agent_run_steps;
create policy agent_run_steps_owner_all on agent_run_steps for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists agent_health_checks_owner_all on agent_health_checks;
create policy agent_health_checks_owner_all on agent_health_checks for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists agent_recovery_events_owner_all on agent_recovery_events;
create policy agent_recovery_events_owner_all on agent_recovery_events for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists revenue_campaigns_owner_all on revenue_campaigns;
create policy revenue_campaigns_owner_all on revenue_campaigns for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists social_share_assets_owner_all on social_share_assets;
create policy social_share_assets_owner_all on social_share_assets for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists social_publish_queue_owner_all on social_publish_queue;
create policy social_publish_queue_owner_all on social_publish_queue for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
