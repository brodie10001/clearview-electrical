-- Lets a job be archived (hidden from the default Jobs list, fully intact
-- and reachable via "Show archived") as an alternative to permanent
-- deletion for jobs that already have real records attached -- a separate
-- concept from job_status, not a new status value.
alter table public.jobs add column archived boolean not null default false;

-- Partial index: only the common "not archived" query benefits from an
-- index at this table's scale, and it stays small as archived jobs pile up.
create index jobs_not_archived_idx on public.jobs (business_id) where not archived;
