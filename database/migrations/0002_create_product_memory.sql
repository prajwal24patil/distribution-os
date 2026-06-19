create table if not exists public.product_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  website_url text not null default '',
  product_summary text not null,
  target_users text not null default '',
  primary_problem text not null default '',
  value_proposition text not null default '',
  pricing text not null default '',
  current_stage text not null default '',
  primary_goal text not null default '',
  target_countries text not null default '',
  preferred_channels text not null default '',
  competitors text not null default '',
  brand_voice text not null default '',
  constraints text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_memory_project_owner_unique unique (project_id, owner_id)
);

alter table public.product_memory enable row level security;

create policy "Users can read their own product memory"
  on public.product_memory
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own product memory"
  on public.product_memory
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own product memory"
  on public.product_memory
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own product memory"
  on public.product_memory
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_product_memory_updated_at on public.product_memory;

create trigger set_product_memory_updated_at
  before update on public.product_memory
  for each row
  execute function public.set_updated_at();

