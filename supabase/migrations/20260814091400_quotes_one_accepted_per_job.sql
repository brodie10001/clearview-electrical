-- Job billing (revised contract value, invoice creation, billing summary) all
-- assume a job has at most one Accepted quote at a time. Nothing enforced
-- that until now, which let two code paths silently disagree about which
-- quote counted as "the" accepted one whenever more than one existed.
create unique index quotes_one_accepted_per_job_idx
  on public.quotes (job_id)
  where status = 'Accepted';
