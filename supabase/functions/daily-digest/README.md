# daily-digest

Edge Function invoked once a day by a pg_cron schedule (see
`supabase/migrations/20260814093100_daily_digest.sql`), not by a Database
Webhook. For every business, it checks that business's job visits scheduled
for tomorrow and its currently-overdue invoices, and -- if there's anything
to report -- sends one digest email to that business's active user(s).
Businesses with nothing to report get no email that day.

Reuses the same Gmail SMTP relay and secrets (`GMAIL_SMTP_HOST`,
`GMAIL_SMTP_USER`, `GMAIL_SMTP_PASSWORD`) already configured for
`feedback-notification` -- Supabase Edge Function secrets are shared across
every function in the project, so nothing new needs to be set for email
sending.

## One-time setup (cannot be done from a migration)

1. **Deploy the function**:

   ```
   supabase functions deploy daily-digest --no-verify-jwt
   ```

   `--no-verify-jwt` because pg_cron calls this server-to-server via
   `net.http_post`, not on behalf of a signed-in user. The function checks
   for the project's own service role key as a bearer token itself (see
   `index.ts`), so this isn't left wide open.

2. **Set `APP_URL`**, if not already set from `feedback-notification`:

   ```
   supabase secrets set APP_URL=https://clearview-electrical.vercel.app
   ```

3. **Store the project URL and service role key in Supabase Vault** --
   these are what the cron job's `net.http_post` call uses to reach and
   authenticate to this function, and can't be committed to a migration
   file in git:

   In the SQL Editor (Dashboard → SQL Editor), run once:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<service role key, from Project Settings → API>', 'service_role_key');
   ```

   The migration's `cron.schedule(...)` call reads these back by name at
   run time (`vault.decrypted_secrets`), so it works unmodified once these
   two secrets exist.

4. **Set `PROJECT_SERVICE_ROLE_KEY` to that exact same value**:

   ```
   supabase secrets set PROJECT_SERVICE_ROLE_KEY=<the same service role key you just put in Vault>
   ```

   The function checks incoming requests against this secret rather than
   the platform's auto-injected `SUPABASE_SERVICE_ROLE_KEY` -- on some
   projects that auto-injected value uses a different (newer, shorter) key
   format than the long-format JWT shown on the API settings page and
   storable in Vault, which would make the two never match. Setting this
   explicitly guarantees the cron job's bearer token and what the function
   checks against are the exact same string.

5. **Confirm the schedule exists**: `select * from cron.job;` should show a
   `daily-digest-emails` row running `0 6 * * *` (06:00 UTC).

## Verifying

Trigger it manually rather than waiting for 06:00 UTC:

```
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/daily-digest',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
  ),
  body := jsonb_build_object('trigger', 'manual')
);
```

Check `select * from net._http_response order by created desc limit 5;` for
the result, and the target inbox(es) for the email. To force a test digest
for a specific business, temporarily give one of its jobs a visit scheduled
for tomorrow, or one of its invoices a past `due_date` with a status other
than Paid/Void/Written Off.
