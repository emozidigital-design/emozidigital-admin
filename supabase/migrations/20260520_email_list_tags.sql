-- Multi-tag support for email lists (replaces single tag_id column)
create table if not exists email_list_tags (
  list_id uuid not null references email_lists(id) on delete cascade,
  tag_id  uuid not null references email_tags(id)  on delete cascade,
  primary key (list_id, tag_id)
);
create index if not exists email_list_tags_list_id_idx on email_list_tags(list_id);
create index if not exists email_list_tags_tag_id_idx  on email_list_tags(tag_id);

-- Migrate existing single-tag data
insert into email_list_tags (list_id, tag_id)
select id, tag_id from email_lists where tag_id is not null
on conflict do nothing;
