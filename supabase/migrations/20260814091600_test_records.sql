-- Structured electrical test results, kept separate from the generic forms
-- engine (compliance_documents) since these are richer/more specific: one
-- row per circuit/equipment tested, not a filled-in document.
create table public.test_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_unit text,
  active boolean not null default true,
  is_custom boolean not null default false
);

create unique index test_types_name_idx on public.test_types (name);

create table public.test_records (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT (not cascade): a test result is a durable safety record and
  -- must never be capable of silently disappearing if the job is deleted.
  job_id uuid not null references public.jobs (id) on delete restrict,
  circuit_or_equipment text not null,
  test_type_id uuid not null references public.test_types (id) on delete restrict,
  -- Only used when test_type_id points at the 'Other/Custom' row.
  custom_test_type_label text,
  measured_value numeric,
  unit text,
  result text not null check (result in ('Pass', 'Fail', 'N/A')),
  instrument_used text,
  tested_at timestamptz not null default now(),
  -- Who performed the test is itself part of the safety record, so this is
  -- RESTRICT too: removing a staff profile must not be able to erase who
  -- signed off a test. Deactivate the profile (profiles.active) instead.
  tested_by uuid references public.profiles (id) on delete restrict,
  notes text,
  created_at timestamptz not null default now()
);

create index test_records_job_id_idx on public.test_records (job_id);
create index test_records_test_type_id_idx on public.test_records (test_type_id);
create index test_records_tested_by_idx on public.test_records (tested_by);

alter table public.test_types enable row level security;
alter table public.test_records enable row level security;

create policy "active users can view test types"
  on public.test_types for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage test types"
  on public.test_types for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "active users can manage test records"
  on public.test_records for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

insert into public.test_types (name, default_unit, is_custom) values
  ('Earth Continuity', 'Ω', false),
  ('Insulation Resistance', 'MΩ', false),
  ('Polarity', null, false),
  ('RCD/RCBO Testing', 'ms', false),
  ('Fault Loop/Earth Fault Loop', 'Ω', false),
  ('Voltage', 'V', false),
  ('Phase Sequence', null, false),
  ('Other/Custom', null, true);
