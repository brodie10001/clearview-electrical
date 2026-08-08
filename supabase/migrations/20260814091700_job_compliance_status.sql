-- Per CLAUDE.md: compliance tracking is a trade module, built as its own
-- table linked by FK rather than columns bolted onto the core `jobs` table.
-- One row per job (created on first use), mirroring property_electrical's
-- shape (property_id as primary key rather than a separate id column).
--
-- testing_completed and compliance_complete are deliberately NOT stored
-- here -- testing_completed is derived from whether test_records exist for
-- the job, and compliance_complete from combining that with the two status
-- columns below, both computed in application code (src/lib/compliance.ts)
-- rather than duplicated and risking drift.
create table public.job_compliance_status (
  job_id uuid primary key references public.jobs (id) on delete restrict,
  requires_testing boolean not null default false,
  requires_certificate boolean not null default false,
  certificate_status text not null default 'Not Required'
    check (certificate_status in ('Not Required', 'Required', 'Pending', 'Issued')),
  requires_notice boolean not null default false,
  notice_status text not null default 'Not Required'
    check (notice_status in ('Not Required', 'Required', 'Lodged')),
  updated_at timestamptz not null default now()
);

create trigger job_compliance_status_set_updated_at
  before update on public.job_compliance_status
  for each row execute function public.set_updated_at();

alter table public.job_compliance_status enable row level security;

create policy "active users can manage job compliance status"
  on public.job_compliance_status for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
