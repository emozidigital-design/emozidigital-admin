-- Run in Supabase SQL Editor
-- Adds section_l (Access & Credentials), section_m (Package & Project),
-- and section_notes (Internal Notes) to the clients table.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS section_l jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS section_m jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS section_notes text;
