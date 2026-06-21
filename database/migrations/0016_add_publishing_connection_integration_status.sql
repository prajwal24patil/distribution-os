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
      'disabled',
      'integration_not_ready'
    )
  );
