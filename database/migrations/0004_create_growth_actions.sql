create table if not exists public.growth_actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  research_run_id uuid references public.research_runs(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_actions_category_check check (
    category in (
      'linkedin_post',
      'seo_blog',
      'whatsapp_community',
      'landing_page',
      'founder_next_action'
    )
  ),
  constraint growth_actions_status_check check (
    status in ('pending', 'approved', 'rejected', 'completed')
  )
);

alter table public.growth_actions enable row level security;

create policy "Users can read their own growth actions"
  on public.growth_actions
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own growth actions"
  on public.growth_actions
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own growth actions"
  on public.growth_actions
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own growth actions"
  on public.growth_actions
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_growth_actions_updated_at on public.growth_actions;

create trigger set_growth_actions_updated_at
  before update on public.growth_actions
  for each row
  execute function public.set_updated_at();

