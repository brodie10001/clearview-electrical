-- Adds a status jobs enter automatically when their linked quote is
-- accepted (see quotes app logic) — sits between quoting and scheduling.
alter table public.jobs drop constraint jobs_job_status_check;

alter table public.jobs add constraint jobs_job_status_check check (
  job_status in (
    'New',
    'Quoting',
    'Awaiting Approval',
    'Ready to Schedule',
    'Scheduled',
    'Travelling',
    'On Site',
    'On Hold',
    'Waiting',
    'Completed',
    'Closed'
  )
);
