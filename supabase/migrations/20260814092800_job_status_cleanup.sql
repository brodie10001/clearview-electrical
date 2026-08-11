-- Removes Travelling, On Hold, and Waiting from job_status -- they never
-- had automatic entry/exit points and just added manual-tracking overhead.
-- Final list: New, Quoting, Awaiting Approval, Ready to Schedule, Scheduled,
-- On Site, Completed, Closed. Cancelled/Declined stay on the separate
-- `outcome` flag, untouched by this migration.

-- Migrate any jobs currently sitting in a removed status before the check
-- constraint is tightened, so this never fails (or silently corrupts data)
-- against a real dataset. "Scheduled" is the closest remaining fit for all
-- three -- each implies a visit is already booked or was recently underway.
do $$
declare
  migrated_count integer;
begin
  update public.jobs
  set job_status = 'Scheduled'
  where job_status in ('Travelling', 'On Hold', 'Waiting');

  get diagnostics migrated_count = row_count;
  raise notice 'job_status_cleanup: migrated % job(s) off a removed status to Scheduled', migrated_count;
end $$;

alter table public.jobs drop constraint jobs_job_status_check;

alter table public.jobs add constraint jobs_job_status_check check (
  job_status in (
    'New',
    'Quoting',
    'Awaiting Approval',
    'Ready to Schedule',
    'Scheduled',
    'On Site',
    'Completed',
    'Closed'
  )
);
