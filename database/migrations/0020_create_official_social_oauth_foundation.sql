alter table publishing_connections
  add column if not exists access_token_encrypted text not null default '',
  add column if not exists refresh_token_encrypted text not null default '';

alter table scheduled_posts
  add column if not exists published_at timestamptz;

alter table scheduled_posts
  drop constraint if exists scheduled_posts_status_check;

alter table scheduled_posts
  add constraint scheduled_posts_status_check
  check (
    status in (
      'ready',
      'scheduled',
      'publishing',
      'published',
      'failed',
      'skipped',
      'manual_required',
      'manual_review_required',
      'retry_scheduled',
      'auto_publish_ready'
    )
  );

alter table social_publish_queue
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists content text not null default '',
  add column if not exists title text not null default '',
  add column if not exists manual_instructions text not null default '';

create index if not exists social_publish_queue_project_owner_status_idx
  on social_publish_queue(project_id, owner_id, status, scheduled_for);

create index if not exists scheduled_posts_project_owner_content_time_idx
  on scheduled_posts(project_id, owner_id, platform, scheduled_for);
