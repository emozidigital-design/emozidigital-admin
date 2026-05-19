alter table email_templates add column if not exists template_type text not null default 'campaign';
