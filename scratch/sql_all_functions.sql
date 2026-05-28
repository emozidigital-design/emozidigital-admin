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
    count(distinct es.id)                                                     as total_sent,
    count(distinct case when ee.event_type = 'open'      then ee.id end)      as opens,
    count(distinct case when ee.event_type = 'click'     then ee.id end)      as clicks,
    count(distinct case when ee.event_type = 'complaint' then ee.id end)      as spam,
    count(distinct case when ee.event_type = 'bounce'    then ee.id end)      as bounced
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


-- ── 4. Increment campaign sent_count cumulatively (called by send route) ──────
-- Replaces the previous overwrite pattern (sent_count = batch_size).
-- Each send batch adds to the running total so multi-batch campaigns are correct.
create or replace function increment_campaign_sent_count(p_id uuid, p_increment int)
returns void
language sql
as $$
  update email_campaigns
  set sent_count = coalesce(sent_count, 0) + p_increment
  where id = p_id;
$$;
