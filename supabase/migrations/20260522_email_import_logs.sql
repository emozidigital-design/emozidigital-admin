create table if not exists email_import_logs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  file_name   text,
  delimiter   text not null default ',',
  total_rows  integer not null default 0,
  imported    integer not null default 0,
  invalid     integer not null default 0,
  tag_ids     uuid[] not null default '{}',
  status      text not null default 'completed',
  created_at  timestamptz not null default now()
);

create index email_import_logs_client_id_idx on email_import_logs(client_id);
