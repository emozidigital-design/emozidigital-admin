alter table newsletter_sends
  add column if not exists recipient_count integer default 0;
