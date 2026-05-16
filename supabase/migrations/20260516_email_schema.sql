-- Email senders: per-client verified sending domains/addresses
create table if not exists email_senders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  from_email text not null,
  from_name text not null,
  domain text not null,
  dkim_status text not null default 'pending', -- pending | verified | failed
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Email templates: reusable HTML with JSON variable placeholders
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  subject text not null,
  html_body text not null,
  variables jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email contacts: per-client subscriber list
create table if not exists email_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  email text not null,
  name text,
  metadata jsonb not null default '{}',
  subscribed boolean not null default true,
  bounced boolean not null default false,
  complained boolean not null default false,
  created_at timestamptz not null default now(),
  unique(client_id, email)
);

-- Email lists: named segments of contacts
create table if not exists email_lists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  filter_criteria jsonb not null default '{}',
  contact_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Junction: contacts in a list
create table if not exists email_list_contacts (
  list_id uuid references email_lists(id) on delete cascade,
  contact_id uuid references email_contacts(id) on delete cascade,
  primary key (list_id, contact_id)
);

-- Email campaigns: scheduled/sent bulk sends
create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  sender_id uuid references email_senders(id),
  template_id uuid references email_templates(id),
  list_id uuid references email_lists(id),
  subject text not null,
  status text not null default 'draft', -- draft | scheduled | sending | sent | failed
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Email sends: one row per recipient per campaign
create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references email_campaigns(id) on delete cascade,
  contact_id uuid references email_contacts(id),
  ses_message_id text,
  status text not null default 'pending', -- pending | sent | delivered | bounced | complained
  sent_at timestamptz
);

-- Email events: raw SNS event log (bounce, complaint, delivery, open, click)
create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  ses_message_id text,
  event_type text not null, -- bounce | complaint | delivery | open | click
  raw_payload jsonb not null default '{}',
  processed_at timestamptz not null default now()
);

-- Index for SNS event lookups by message id
create index if not exists email_events_ses_message_id_idx on email_events(ses_message_id);
create index if not exists email_sends_ses_message_id_idx on email_sends(ses_message_id);
create index if not exists email_contacts_client_id_idx on email_contacts(client_id);
create index if not exists email_campaigns_client_id_idx on email_campaigns(client_id);
