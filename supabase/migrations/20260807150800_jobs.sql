create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  primary_contact_id uuid references public.contacts (id) on delete set null,
  job_status text not null default 'New' check (
    job_status in (
      'New',
      'Quoting',
      'Awaiting Approval',
      'Scheduled',
      'Travelling',
      'On Site',
      'On Hold',
      'Waiting',
      'Completed',
      'Closed'
    )
  ),
  outcome text check (outcome is null or outcome in ('cancelled', 'declined')),
  invoice_status text not null default 'Not Required' check (
    invoice_status in (
      'Not Required',
      'Draft',
      'Sent',
      'Partially Paid',
      'Paid',
      'Overdue',
      'Written Off'
    )
  ),
  -- Booked visit time for this job. Nullable: a job can exist before it's
  -- scheduled (e.g. while Quoting or Awaiting Approval).
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_property_id_idx on public.jobs (property_id);
create index jobs_job_status_idx on public.jobs (job_status);
create index jobs_invoice_status_idx on public.jobs (invoice_status);
create index jobs_scheduled_at_idx on public.jobs (scheduled_at);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

create policy "active users can manage jobs"
  on public.jobs for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
