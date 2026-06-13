alter table email_import_logs
  add column if not exists invalid_rows jsonb not null default '[]';
