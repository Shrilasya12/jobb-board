-- Safe RLS policies file (drops existing policies first, then creates them)
-- Run this in Supabase SQL editor.

-- Enable row level security (idempotent)
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist (prevents "policy already exists" errors)
DROP POLICY IF EXISTS anon_select_active_jobs ON jobs;
DROP POLICY IF EXISTS anon_select_job_types ON job_types;
DROP POLICY IF EXISTS anon_insert_applications ON applications;

-- Create policies

-- Allow public SELECT on active jobs
CREATE POLICY anon_select_active_jobs ON jobs
  FOR SELECT USING (status = 'active');

-- Allow public SELECT on job_types
CREATE POLICY anon_select_job_types ON job_types
  FOR SELECT USING (true);

-- Allow anonymous insert into applications (so public can apply)
CREATE POLICY anon_insert_applications ON applications
  FOR INSERT WITH CHECK (true);

-- Important notes:
-- - Admin writes (INSERT/UPDATE/DELETE on jobs & job_types) should be restricted to authenticated admins.
-- - For this MVP we gate the UI admin area via ADMIN_SECRET. That is UI-only protection and does NOT prevent an attacker from calling the Supabase API directly with anon key to manipulate data.
-- - To make admin truly secure: implement Supabase Auth + RLS policies that restrict management operations to admin users.