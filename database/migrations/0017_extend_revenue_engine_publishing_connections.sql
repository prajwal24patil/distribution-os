alter table publishing_connections
  drop constraint if exists publishing_connections_platform_check;

alter table publishing_connections
  add constraint publishing_connections_platform_check
  check (
    platform in (
      'linkedin',
      'x',
      'google_business_profile',
      'reddit',
      'quora_manual',
      'whatsapp_manual',
      'instagram_manual',
      'youtube_manual',
      'blog'
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
      'manual_required',
      'integration_not_ready',
      'permission_missing',
      'disabled'
    )
  );
