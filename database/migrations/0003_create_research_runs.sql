create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  audience_insights text not null,
  competitor_insights text not null,
  keyword_opportunities text not null,
  channel_opportunities text not null,
  pain_points text not null,
  positioning_angles text not null,
  assumptions text not null,
  confidence_score integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_runs_confidence_score_check check (
    confidence_score >= 0
    and confidence_score <= 100
  )
);

alter table public.research_runs enable row level security;

create policy "Users can read their own research runs"
  on public.research_runs
  for select
  using (auth.uid() = owner_id);

create policy "Users can create their own research runs"
  on public.research_runs
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own research runs"
  on public.research_runs
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own research runs"
  on public.research_runs
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_research_runs_updated_at on public.research_runs;

create trigger set_research_runs_updated_at
  before update on public.research_runs
  for each row
  execute function public.set_updated_at();

