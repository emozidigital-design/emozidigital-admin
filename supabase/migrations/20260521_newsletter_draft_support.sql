-- Add draft/schedule/test support fields to newsletter_sends
alter table newsletter_sends
  add column if not exists tag_ids text[] default '{}',
  add column if not exists trending_post_ids text[] default '{}',
  add column if not exists newsletter_template_id uuid,
  add column if not exists scheduled_at timestamptz;
