# feedback-notification

Edge Function triggered by a Supabase Database Webhook on `insert` into
`public.feedback`. Sends a plain-text/HTML notification email to the
platform admin. Notify-only -- feedback already lives safely in the
database regardless of whether this send succeeds.

## One-time setup (cannot be done from a migration)

1. **Deploy the function** (from the repo root, with the Supabase CLI
   logged in and linked to the project):

   ```
   supabase functions deploy feedback-notification --no-verify-jwt
   ```

   `--no-verify-jwt` is used because the Database Webhook calls this
   function server-to-server, not on behalf of a signed-in user.

2. **Set secrets** for the function (uses a *separate* Gmail
   app-password pair from Auth's SMTP config, since Auth's own SMTP
   secrets aren't readable from here -- same Gmail relay, different
   credential):

   ```
   supabase secrets set \
     GMAIL_SMTP_USER=<the gmail address> \
     GMAIL_SMTP_PASSWORD=<an app password for that gmail account> \
     FEEDBACK_NOTIFICATION_EMAIL=<inbox to notify> \
     APP_URL=https://clearview-electrical.vercel.app
   ```

3. **Create the Database Webhook** in the Supabase Dashboard:
   Database → Webhooks → Create a new webhook
   - Table: `feedback`
   - Events: `Insert`
   - Type: `Supabase Edge Functions`
   - Edge Function: `feedback-notification`

   Creating it this way (rather than a hand-written SQL trigger) lets
   Supabase wire the function URL and auth automatically instead of a
   project ref / service key needing to be hardcoded into a migration.

## Verifying

Submit a piece of feedback from the app, then check the target inbox.
The email links back to `/admin/feedback#<feedback id>` -- the admin
list gives each row that same `id` as an anchor, so the link opens
straight to it.
