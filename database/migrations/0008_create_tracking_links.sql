create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_item_id uuid not null references public.campaign_items(id) on delete cascade,
  destination_url text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text not null,
  tracking_url text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracking_links_clicks_check check (clicks >= 0)
);

create table if not exists public.click_events (
  id uuid primary key default gen_random_uuid(),
  tracking_link_id uuid not null references public.tracking_links(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  medium text not null,
  campaign text not null,
  content text not null,
  clicked_at timestamptz not null default now()
);

alter table public.tracking_links enable row level security;
alter table public.click_events enable row level security;

create policy "Users can read their own tracking links"
  on public.tracking_links
  for select
  using (auth.uid() = owner_id);

create policy "Public can resolve tracking links"
  on public.tracking_links
  for select
  using (true);

create policy "Users can create their own tracking links"
  on public.tracking_links
  for insert
  with check (auth.uid() = owner_id);

create policy "Public can increment tracking link clicks"
  on public.tracking_links
  for update
  using (true)
  with check (true);

create policy "Users can delete their own tracking links"
  on public.tracking_links
  for delete
  using (auth.uid() = owner_id);

create policy "Users can read their own click events"
  on public.click_events
  for select
  using (auth.uid() = owner_id);

create policy "Public can create click events"
  on public.click_events
  for insert
  with check (true);

drop trigger if exists set_tracking_links_updated_at on public.tracking_links;
create trigger set_tracking_links_updated_at
  before update on public.tracking_links
  for each row
  execute function public.set_updated_at();
