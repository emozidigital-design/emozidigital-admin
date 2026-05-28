-- Run this in the Supabase SQL editor once.
-- Returns per-campaign event counts without pulling raw rows into Node.
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
    count(*)                                                         as total_sent,
    count(*) filter (where ee.event_type = 'open')                  as opens,
    count(*) filter (where ee.event_type = 'click')                 as clicks,
    count(*) filter (where ee.event_type = 'complaint')             as spam,
    count(*) filter (where ee.event_type = 'bounce')                as bounced
  from email_sends es
  left join email_events ee on ee.ses_message_id = es.ses_message_id
  where es.campaign_id = any(p_campaign_ids)
  group by es.campaign_id
$$;
