-- Link individual email_sends rows to their newsletter batch
alter table email_sends
  add column if not exists newsletter_send_id uuid references newsletter_sends(id);

-- Denormalised open/click counts on the newsletter batch row
alter table newsletter_sends
  add column if not exists opens_count integer default 0,
  add column if not exists clicks_count integer default 0;

create index if not exists email_sends_newsletter_send_id_idx
  on email_sends(newsletter_send_id);

-- Atomic increment functions (safe under concurrent SNS events)
create or replace function increment_newsletter_opens(p_id uuid)
returns void language sql as $$
  update newsletter_sends set opens_count = opens_count + 1 where id = p_id;
$$;

create or replace function increment_newsletter_clicks(p_id uuid)
returns void language sql as $$
  update newsletter_sends set clicks_count = clicks_count + 1 where id = p_id;
$$;
