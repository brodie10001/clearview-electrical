-- Daily digest: schedules the `daily-digest` Edge Function (see
-- supabase/functions/daily-digest/) to run once every morning via pg_cron.
-- The function itself does the actual per-business querying and emailing --
-- this migration only wires up the schedule.

-- pg_cron/pg_net are Supabase-hosted-only extensions (not available in a
-- vanilla local Postgres), so this part of the migration can't be exercised
-- against the local verification harness used elsewhere in this repo --
-- only reviewed against Supabase's documented pattern for scheduling Edge
-- Functions. The digest's actual query logic (the part that matters for
-- business_id scoping) is plain SQL/PostgREST and was verified locally.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant all on all tables in schema cron to postgres;

-- 06:00 UTC -- "early morning", using the same UTC-as-the-day-boundary
-- convention the rest of the app already uses for "today"/"tomorrow" (see
-- todayDateString() and the note in the job_visits migration: the server,
-- and Postgres' default session timezone on this project, both run in
-- UTC). cron.schedule() upserts by job name, so re-running this migration
-- (or a future one that calls it again with the same name) safely updates
-- the existing schedule rather than erroring or duplicating it.
--
-- The URL and bearer token are pulled from Supabase Vault at run time
-- (`project_url` / `service_role_key`) rather than being written into this
-- file -- an Edge Function's URL is per-project and the service role key is
-- a secret, neither of which belongs in a migration that ships in git. See
-- supabase/functions/daily-digest/README.md for the one-time Vault setup
-- this depends on.
select
  cron.schedule(
    'daily-digest-emails',
    '0 6 * * *',
    $$
    select
      net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
            || '/functions/v1/daily-digest',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' ||
              (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
          ),
          body := jsonb_build_object('trigger', 'cron', 'time', now())
      ) as request_id;
    $$
  );

-- Supports the digest's (and any future "what's scheduled for business X
-- on date Y" query's) business_id + scheduled_date lookup -- the existing
-- single-column indexes on job_visits would each only narrow one side of
-- that filter.
create index job_visits_business_scheduled_date_idx
  on public.job_visits (business_id, scheduled_date);
