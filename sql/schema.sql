-- Supabase schema for Job Board (slug-based job URLs)
create extension if not exists "pgcrypto";

-- Job types
create table if not exists job_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  short_description text,
  description text,
  overview text,
  position_summary text,
  responsibilities text,
  requirements text,
  qualifications text,
  benefits text,
  location text,
  salary text,
  job_type_id uuid references job_types(id) on delete set null,
  status text default 'active', -- active | draft | closed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Applications
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  full_name text,
  email text,
  phone_number text,
  location text,
  how_heard text,
  why_interested text,
  experience text,
  resume_path text,
  resume_url text,
  cover_letter_path text,
  cover_letter_url text,
  agree_data_sharing boolean default false,
  status text default 'submitted',
  created_at timestamptz default now()
);

create index if not exists idx_jobs_status_created_at on jobs(status, created_at desc);
create index if not exists idx_applications_job_id_created_at on applications(job_id, created_at desc);