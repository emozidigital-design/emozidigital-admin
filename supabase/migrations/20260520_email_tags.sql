-- email_tags: per-client tag definitions
create table email_tags (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(client_id, name)
);

-- email_contact_tags: many-to-many junction between contacts and tags
create table email_contact_tags (
  contact_id uuid not null references email_contacts(id) on delete cascade,
  tag_id uuid not null references email_tags(id) on delete cascade,
  primary key (contact_id, tag_id)
);

-- email_lists can optionally be "built on" a tag; contacts added auto-inherit it
alter table email_lists add column tag_id uuid references email_tags(id) on delete set null;

create index email_tags_client_id_idx on email_tags(client_id);
create index email_contact_tags_contact_id_idx on email_contact_tags(contact_id);
create index email_contact_tags_tag_id_idx on email_contact_tags(tag_id);
