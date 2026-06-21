create index if not exists publisher_queue_project_owner_status_created_idx
  on publisher_queue(project_id, owner_id, status, created_at desc);

create index if not exists publisher_queue_project_owner_platform_idx
  on publisher_queue(project_id, owner_id, platform);

create index if not exists publisher_queue_project_owner_qa_idx
  on publisher_queue(project_id, owner_id, qa_status);

create index if not exists publisher_queue_project_owner_score_idx
  on publisher_queue(project_id, owner_id, predicted_rank_score desc, created_at desc);

create index if not exists distribution_cycles_project_owner_created_idx
  on distribution_cycles(project_id, owner_id, created_at desc);

create index if not exists distribution_cycles_project_owner_status_idx
  on distribution_cycles(project_id, owner_id, status);

create index if not exists daily_autopilot_runs_project_owner_created_idx
  on daily_autopilot_runs(project_id, owner_id, created_at desc);

create index if not exists daily_autopilot_runs_project_owner_status_idx
  on daily_autopilot_runs(project_id, owner_id, status);

create index if not exists tracking_links_project_owner_created_idx
  on tracking_links(project_id, owner_id, created_at desc);

create index if not exists tracking_links_tracking_link_id_idx
  on tracking_links(id);

create index if not exists campaign_items_project_owner_created_idx
  on campaign_items(project_id, owner_id, created_at desc);

create index if not exists campaign_items_project_owner_status_idx
  on campaign_items(project_id, owner_id, status);

create index if not exists click_events_tracking_link_id_idx
  on click_events(tracking_link_id);

create index if not exists campaign_results_project_owner_created_idx
  on campaign_results(project_id, owner_id, created_at desc);

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    execute 'create index if not exists conversion_events_project_owner_created_idx on conversion_events(project_id, owner_id, created_at desc)';
    execute 'create index if not exists conversion_events_tracking_link_id_idx on conversion_events(tracking_link_id)';
  end if;
end $$;
