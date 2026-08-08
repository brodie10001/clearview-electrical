-- Quote locking/versioning: a quote's content is treated as immutable once
-- it leaves Draft (derived as `status <> 'Draft'` in application code, no
-- extra column needed). Editing a locked quote requires explicitly starting
-- a new version, which snapshots the current state here first.
alter table public.quotes add column version integer not null default 1;

create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  version_number integer not null,
  -- Point-in-time snapshot of everything the public page/PDF showed at that
  -- version: line items, totals, expiry, scope of work. A single JSONB
  -- column keeps this simple rather than a parallel versioned line-items
  -- table for a feature that's read-only history.
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create unique index quote_versions_quote_version_idx on public.quote_versions (quote_id, version_number);

alter table public.quote_versions enable row level security;

create policy "active users can manage quote versions"
  on public.quote_versions for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- One cryptographically random, unguessable token per quote. The public
-- route resolves a token to exactly one quote_id and never anything else --
-- enforced in application code (a service-role client with no RLS access to
-- key off, since anonymous visitors have no Supabase session), not by RLS.
create table public.quote_public_tokens (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now()
);

create unique index quote_public_tokens_quote_id_idx on public.quote_public_tokens (quote_id);
create unique index quote_public_tokens_token_idx on public.quote_public_tokens (token);

alter table public.quote_public_tokens enable row level security;

create policy "active users can manage quote public tokens"
  on public.quote_public_tokens for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- Simple activity timeline shown on the quote detail screen.
create table public.quote_activity (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  event_type text not null check (event_type in ('Sent', 'Viewed', 'Accepted', 'Declined')),
  note text,
  created_at timestamptz not null default now()
);

create index quote_activity_quote_id_idx on public.quote_activity (quote_id);

alter table public.quote_activity enable row level security;

create policy "active users can manage quote activity"
  on public.quote_activity for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- Business-wide terms & conditions boilerplate, same pattern as
-- quote_header/invoice_footer -- shown on the public quote page and PDF.
alter table public.business_settings add column quote_terms text;
