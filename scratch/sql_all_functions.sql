-- ============================================================
-- Run ALL of these in the Supabase SQL editor (paste & run once).
-- Safe to re-run — all use CREATE OR REPLACE.
-- ============================================================


-- ── 1. Campaign event counts (for statistics charts + email list) ────────────
-- Aggregates email_sends → email_events in DB, returns one row per campaign.
-- Eliminates shipping raw event rows to Node for counting.
create or replace function get_campaign_event_counts(p_campaign_ids uuid[])
returns table (
  campaign_id uuid,
  total_sent  bigint,
  opens       bigint,
  clicks      bigint,
  spam        bigint,
  bounced     bigint
)
language sql
stable
as $$
  select
    es.campaign_id,
    count(*)                                                          as total_sent,
    count(*) filter (where ee.event_type = 'open')                   as opens,
    count(*) filter (where ee.event_type = 'click')                  as clicks,
    count(*) filter (where ee.event_type = 'complaint')              as spam,
    count(*) filter (where ee.event_type = 'bounce')                 as bounced
  from email_sends es
  left join email_events ee on ee.ses_message_id = es.ses_message_id
  where es.campaign_id = any(p_campaign_ids)
  group by es.campaign_id
$$;


-- ── 2. Increment campaign opens (called by SNS webhook on Open events) ───────
-- Mirrors increment_newsletter_opens used for newsletter_sends.
create or replace function increment_campaign_opens(p_id uuid)
returns void
language sql
as $$
  update email_campaigns
  set opens_count = coalesce(opens_count, 0) + 1
  where id = p_id;
$$;


-- ── 3. Increment campaign clicks (called by SNS webhook on Click events) ─────
-- Mirrors increment_newsletter_clicks used for newsletter_sends.
create or replace function increment_campaign_clicks(p_id uuid)
returns void
language sql
as $$
  update email_campaigns
  set clicks_count = coalesce(clicks_count, 0) + 1
  where id = p_id;
$$;
