create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  campaign_type text not null,
  status text not null default 'draft',
  next_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_type_check check (
    campaign_type in (
      'linkedin_founder_post',
      'seo_blog',
      'whatsapp_community_share',
      'reddit_community_reply',
      'landing_page_headline',
      'referral_campaign'
    )
  ),
  constraint campaigns_status_check check (status in ('draft', 'active', 'completed'))
);

create table if not exists public.campaign_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_type text not null,
  channel text not null,
  hook text not null,
  content text not null,
  target_audience text not null,
  cta text not null,
  expected_outcome text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text not null,
  utm_link text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_items_type_check check (
    campaign_type in (
      'linkedin_founder_post',
      'seo_blog',
      'whatsapp_community_share',
      'reddit_community_reply',
      'landing_page_headline',
      'referral_campaign'
    )
  ),
  constraint campaign_items_status_check check (
    status in ('draft', 'approved', 'posted', 'completed', 'failed')
  )
);

create table if not exists public.campaign_results (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  campaign_item_id uuid not null references public.campaign_items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  views integer not null default 0,
  clicks integer not null default 0,
  signups integer not null default 0,
  paid_users integer not null default 0,
  revenue numeric(12, 2) not null default 0,
  learning text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_results_views_check check (views >= 0),
  constraint campaign_results_clicks_check check (clicks >= 0),
  constraint campaign_results_signups_check check (signups >= 0),
  constraint campaign_results_paid_users_check check (paid_users >= 0),
  constraint campaign_results_revenue_check check (revenue >= 0)
);

alter table public.campaigns enable row level security;
alter table public.campaign_items enable row level security;
alter table public.campaign_results enable row level security;

create policy "Users can read their own campaigns"
  on public.campaigns
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own campaigns"
  on public.campaigns
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own campaigns"
  on public.campaigns
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own campaigns"
  on public.campaigns
  for delete
  using (auth.uid() = owner_id);

create policy "Users can read their own campaign items"
  on public.campaign_items
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own campaign items"
  on public.campaign_items
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own campaign items"
  on public.campaign_items
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own campaign items"
  on public.campaign_items
  for delete
  using (auth.uid() = owner_id);

create policy "Users can read their own campaign results"
  on public.campaign_results
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own campaign results"
  on public.campaign_results
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own campaign results"
  on public.campaign_results
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own campaign results"
  on public.campaign_results
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
  before update on public.campaigns
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_campaign_items_updated_at on public.campaign_items;
create trigger set_campaign_items_updated_at
  before update on public.campaign_items
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_campaign_results_updated_at on public.campaign_results;
create trigger set_campaign_results_updated_at
  before update on public.campaign_results
  for each row
  execute function public.set_updated_at();
