-- RestoReports v2 Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- COMPANIES (account_companies)
-- ============================================================
create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  -- Owner info
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone_1 text,
  phone_2 text,
  fax text,
  -- Business info
  business_name text not null,
  business_address_1 text not null,
  business_address_2 text,
  business_city text not null,
  business_state text not null,
  business_zip_code text not null,
  -- Billing
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text default 'trialing',
  trial_ends_at timestamptz,
  -- Status
  trial boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USERS (app_users — links to Supabase Auth)
-- ============================================================
create table public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  role text not null default 'technician' check (role in ('owner', 'admin', 'technician')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- JOBS (properties)
-- ============================================================
create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  -- Location
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  phone text,
  -- Job info
  claim_number text,
  job_number text,
  -- Contact
  contact_first_name text,
  contact_last_name text,
  contact_email text,
  contact_phone text,
  -- Details
  description text,
  status text not null default 'Active' check (status in ('Active','Pending','Complete','Opportunity','Loss')),
  private boolean not null default false,
  private_password text,
  -- Meta
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROOMS
-- ============================================================
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text not null,
  description text,
  map_data text,  -- Konva JSON for equipment placement
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- EQUIPMENT TYPES (per-company)
-- ============================================================
create table public.equipment_types (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

-- Default equipment types inserted per company on signup (via trigger or function)

-- ============================================================
-- ROOM READINGS (daily moisture/humidity log)
-- ============================================================
create table public.room_readings (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  technician_name text not null,
  notes text,
  notes_private boolean not null default false,
  temperature_in numeric(5,2),
  relative_humidity_in numeric(5,2),
  grains_per_pound_in numeric(6,2),
  created_at timestamptz not null default now()
);

-- ============================================================
-- HUMIDITY READINGS (sub-readings per room reading)
-- ============================================================
create table public.humidity_readings (
  id uuid primary key default uuid_generate_v4(),
  room_reading_id uuid not null references public.room_readings(id) on delete cascade,
  label varchar(2) not null,
  value numeric(5,2) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- EQUIPMENT READINGS (per room reading)
-- ============================================================
create table public.equipment_readings (
  id uuid primary key default uuid_generate_v4(),
  room_reading_id uuid not null references public.room_readings(id) on delete cascade,
  equipment_type_id uuid not null references public.equipment_types(id) on delete cascade,
  count smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- JOB DOCUMENTS & PHOTOS
-- ============================================================
create table public.job_documents (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  tags text,
  description text,
  type text not null check (type in ('document','photo')),
  name text not null,           -- original filename
  storage_path text not null,   -- Supabase Storage path
  private boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- JOB NOTES
-- ============================================================
create table public.job_notes (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  technician_name text not null,
  value text not null,
  private boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ADMIN NOTES (on companies — internal use)
-- ============================================================
create table public.admin_notes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_app_users_company_id on public.app_users(company_id);
create index idx_jobs_company_id on public.jobs(company_id);
create index idx_jobs_status on public.jobs(status);
create index idx_rooms_job_id on public.rooms(job_id);
create index idx_room_readings_room_id on public.room_readings(room_id);
create index idx_humidity_readings_room_reading_id on public.humidity_readings(room_reading_id);
create index idx_equipment_readings_room_reading_id on public.equipment_readings(room_reading_id);
create index idx_job_documents_job_id on public.job_documents(job_id);
create index idx_job_notes_job_id on public.job_notes(job_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.companies enable row level security;
alter table public.app_users enable row level security;
alter table public.jobs enable row level security;
alter table public.rooms enable row level security;
alter table public.equipment_types enable row level security;
alter table public.room_readings enable row level security;
alter table public.humidity_readings enable row level security;
alter table public.equipment_readings enable row level security;
alter table public.job_documents enable row level security;
alter table public.job_notes enable row level security;
alter table public.admin_notes enable row level security;

-- Helper function: get current user's company_id
create or replace function public.get_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.app_users where id = auth.uid();
$$;

-- Helper function: is current user an admin (platform admin)?
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.app_users
    where id = auth.uid() and role = 'owner'
    -- Platform admins are identified by a special flag or email — 
    -- for now, use a separate metadata approach. 
    -- We'll set app_metadata.platform_admin = true via service role.
  );
$$;

-- COMPANIES: user can see their own company
create policy "Users can view their own company"
  on public.companies for select
  using (id = public.get_company_id());

create policy "Users can update their own company"
  on public.companies for update
  using (id = public.get_company_id());

-- APP_USERS: users can see users in their company
create policy "Users can view company users"
  on public.app_users for select
  using (company_id = public.get_company_id());

create policy "Users can update their own profile"
  on public.app_users for update
  using (id = auth.uid());

-- JOBS
create policy "Users can view their company jobs"
  on public.jobs for select
  using (company_id = public.get_company_id());

create policy "Users can create jobs"
  on public.jobs for insert
  with check (company_id = public.get_company_id());

create policy "Users can update their company jobs"
  on public.jobs for update
  using (company_id = public.get_company_id());

create policy "Users can delete their company jobs"
  on public.jobs for delete
  using (company_id = public.get_company_id());

-- ROOMS
create policy "Users can view rooms in their company jobs"
  on public.rooms for select
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can create rooms"
  on public.rooms for insert
  with check (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can update rooms"
  on public.rooms for update
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can delete rooms"
  on public.rooms for delete
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

-- EQUIPMENT TYPES
create policy "Users can view their equipment types"
  on public.equipment_types for select
  using (company_id = public.get_company_id());

create policy "Users can create equipment types"
  on public.equipment_types for insert
  with check (company_id = public.get_company_id());

create policy "Users can update equipment types"
  on public.equipment_types for update
  using (company_id = public.get_company_id());

create policy "Users can delete equipment types"
  on public.equipment_types for delete
  using (company_id = public.get_company_id());

-- ROOM READINGS
create policy "Users can view room readings"
  on public.room_readings for select
  using (room_id in (
    select r.id from public.rooms r
    join public.jobs j on r.job_id = j.id
    where j.company_id = public.get_company_id()
  ));

create policy "Users can create room readings"
  on public.room_readings for insert
  with check (room_id in (
    select r.id from public.rooms r
    join public.jobs j on r.job_id = j.id
    where j.company_id = public.get_company_id()
  ));

create policy "Users can update room readings"
  on public.room_readings for update
  using (room_id in (
    select r.id from public.rooms r
    join public.jobs j on r.job_id = j.id
    where j.company_id = public.get_company_id()
  ));

-- HUMIDITY READINGS
create policy "Users can view humidity readings"
  on public.humidity_readings for select
  using (room_reading_id in (
    select rr.id from public.room_readings rr
    join public.rooms r on rr.room_id = r.id
    join public.jobs j on r.job_id = j.id
    where j.company_id = public.get_company_id()
  ));

create policy "Users can create humidity readings"
  on public.humidity_readings for insert
  with check (room_reading_id in (
    select rr.id from public.room_readings rr
    join public.rooms r on rr.room_id = r.id
    join public.jobs j on r.job_id = j.id
    where j.company_id = public.get_company_id()
  ));

-- EQUIPMENT READINGS
create policy "Users can view equipment readings"
  on public.equipment_readings for select
  using (room_reading_id in (
    select rr.id from public.room_readings rr
    join public.rooms r on rr.room_id = r.id
    join public.jobs j on r.job_id = j.id
    where j.company_id = public.get_company_id()
  ));

create policy "Users can create equipment readings"
  on public.equipment_readings for insert
  with check (room_reading_id in (
    select rr.id from public.room_readings rr
    join public.rooms r on rr.room_id = r.id
    join public.jobs j on r.job_id = j.id
    where j.company_id = public.get_company_id()
  ));

-- JOB DOCUMENTS
create policy "Users can view job documents"
  on public.job_documents for select
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can create job documents"
  on public.job_documents for insert
  with check (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can update job documents"
  on public.job_documents for update
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can delete job documents"
  on public.job_documents for delete
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

-- JOB NOTES
create policy "Users can view job notes"
  on public.job_notes for select
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can create job notes"
  on public.job_notes for insert
  with check (job_id in (select id from public.jobs where company_id = public.get_company_id()));

create policy "Users can update job notes"
  on public.job_notes for update
  using (job_id in (select id from public.jobs where company_id = public.get_company_id()));

-- ADMIN NOTES: service role only (no user-level policy)
-- These are managed by platform admins via service role key

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in Supabase Storage or via API:
-- 
-- insert into storage.buckets (id, name, public) values ('job-files', 'job-files', false);
--
-- Storage RLS policy: 
-- Users can upload/read files under their company_id prefix
-- Path format: {company_id}/{job_id}/{filename}
