create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  customer text not null default 'CareerScore',
  status text not null default 'planning',
  channel text not null default 'manual',
  owner text not null default 'Founder',
  goal text not null,
  summary text not null default '',
  progress integer not null default 0,
  experiments integer not null default 0,
  content_items integer not null default 0,
  next_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_status_check check (status in ('active', 'planning', 'paused')),
  constraint projects_progress_check check (progress >= 0 and progress <= 100),
  constraint projects_experiments_check check (experiments >= 0),
  constraint projects_content_items_check check (content_items >= 0)
);

alter table public.projects enable row level security;

create policy "Users can read their own projects"
  on public.projects
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;

create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

