create table public.job_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  scheduled_date date not null,
  start_time time,
  expected_duration_minutes integer check (expected_duration_minutes is null or expected_duration_minutes > 0),
  assigned_worker uuid references public.profiles (id) on delete set null,
  notes text,
  visit_status text not null default 'Scheduled'
    check (visit_status in ('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_visits_job_id_idx on public.job_visits (job_id);
create index job_visits_scheduled_date_idx on public.job_visits (scheduled_date);
create index job_visits_assigned_worker_idx on public.job_visits (assigned_worker);

create trigger job_visits_set_updated_at
  before update on public.job_visits
  for each row execute function public.set_updated_at();

alter table public.job_visits enable row level security;

create policy "active users can manage job visits"
  on public.job_visits for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- Migrate any existing single scheduled_at timestamp per job into an initial
-- visit record, then retire the old field. UTC is used to split the
-- timestamp into date/time parts, matching how the rest of the app has been
-- rendering these values (server-local getters, server running in UTC).
insert into public.job_visits (job_id, scheduled_date, start_time, visit_status)
select id, (scheduled_at at time zone 'utc')::date, (scheduled_at at time zone 'utc')::time, 'Scheduled'
from public.jobs
where scheduled_at is not null;

alter table public.jobs drop column scheduled_at;
