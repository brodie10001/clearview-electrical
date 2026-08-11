-- In-app feedback: any active user can submit a bug report / feature
-- request / general note; only a platform admin (Brodie -- never a
-- self-service role) can read any of it back, across every business.
-- Its own module table, not bolted onto jobs/properties/businesses, since
-- it isn't a trade concept at all -- it's a Tradeline-platform concern.

alter table public.profiles
  add column is_platform_admin boolean not null default false;

-- Defense in depth: the existing "users can update their own profile"
-- policy has no column allowlist, so without this trigger a user could
-- self-promote by just including is_platform_admin in an otherwise
-- ordinary profile update. Block any change to this column unless it's
-- coming from a direct database session (the Supabase SQL Editor and
-- migrations both run as `postgres`), never from the app's `authenticated`
-- role -- so setting it is only ever the one-time manual data update this
-- feature calls for, never something reachable through the UI or API.
create function public.protect_platform_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if new.is_platform_admin is distinct from old.is_platform_admin
     and current_user <> 'postgres' then
    raise exception 'is_platform_admin can only be changed directly in the database, not via the app.';
  end if;
  return new;
end;
$$;

create trigger protect_platform_admin_flag
  before update on public.profiles
  for each row execute function public.protect_platform_admin_flag();

create function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and is_platform_admin = true
  );
$$;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade
    default public.current_business_id(),
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  -- Snapshotted at submission time rather than joined live -- businesses
  -- and profiles intentionally have no platform-admin RLS exception (see
  -- below), so a live join from an admin's session would come back null
  -- for every business but their own. Denormalizing here means the admin
  -- view never needs to read those tables cross-business at all.
  business_name text not null,
  submitted_by_name text not null,
  type text not null check (type in ('Bug Report', 'Feature Request', 'General Feedback')),
  title text not null,
  description text not null,
  screenshot_url text,
  page_path text,
  status text not null default 'New' check (status in ('New', 'Reviewed', 'Resolved')),
  created_at timestamptz not null default now()
);

create index feedback_business_id_idx on public.feedback (business_id);
create index feedback_user_id_idx on public.feedback (user_id);
create index feedback_status_idx on public.feedback (status);
create index feedback_type_idx on public.feedback (type);

alter table public.feedback enable row level security;

-- Fills business_name/submitted_by_name from data the inserting user
-- already has ordinary read access to under existing RLS (their own
-- business, their own profile) -- no security definer or RLS bypass
-- needed, this trigger runs as the calling user.
create function public.snapshot_feedback_submitter()
returns trigger
language plpgsql
as $$
begin
  new.business_name := (
    select coalesce(bs.trading_name, b.name)
    from public.businesses b
    left join public.business_settings bs on bs.business_id = b.id
    where b.id = new.business_id
  );
  new.submitted_by_name := (
    select coalesce(full_name, email, 'Unknown user')
    from public.profiles
    where id = new.user_id
  );
  return new;
end;
$$;

create trigger snapshot_feedback_submitter
  before insert on public.feedback
  for each row execute function public.snapshot_feedback_submitter();

-- Submit-only for regular users -- no read policy for them at all, per the
-- beta scope. A business can only ever insert feedback tagged as its own.
create policy "active users can submit feedback"
  on public.feedback for insert
  to authenticated
  with check (public.is_active_user() and business_id = public.current_business_id());

-- The one deliberate cross-business exception in this schema: a platform
-- admin sees and triages every business's feedback. Scoped to this table
-- only -- is_platform_admin must never be used to bypass isolation
-- anywhere else.
create policy "platform admins can view all feedback"
  on public.feedback for select
  to authenticated
  using (public.is_platform_admin());

create policy "platform admins can triage feedback"
  on public.feedback for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Reuse the existing private `documents` Storage bucket for screenshots
-- instead of a new bucket -- upload is already open to any active user
-- (see storage policies from the documents feature), so only the read
-- side needs extending: a platform admin can view any screenshot
-- referenced by a feedback row, regardless of which business submitted it.
alter policy "active users can read document files" on storage.objects
  using (
    bucket_id = 'documents'
    and (
      exists (
        select 1 from public.documents d
        where d.file_url = storage.objects.name
          and d.business_id = public.current_business_id()
      )
      or (
        public.is_platform_admin()
        and exists (select 1 from public.feedback f where f.screenshot_url = storage.objects.name)
      )
    )
  );
