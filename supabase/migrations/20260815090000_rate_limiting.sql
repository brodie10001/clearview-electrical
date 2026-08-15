-- Backs a small IP-keyed rate limiter for the handful of endpoints an
-- anonymous visitor can hit with no Supabase auth session at all (the
-- public invoice/quote pages' accept/decline and PDF-download routes) --
-- there's no Supabase auth rate limiting on these since they never touch
-- supabase.auth, and the only thing standing between a visitor and the
-- underlying row is an unguessable token, which is exactly the kind of
-- thing worth rate-limiting against brute-force guessing.
--
-- Only ever called via the service-role client from trusted server code
-- (see src/lib/rate-limit.ts), which bypasses RLS/grants entirely, so no
-- policies or grants to anon/authenticated are needed here.
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_key_created_idx on public.rate_limit_hits (key, created_at);

alter table public.rate_limit_hits enable row level security;

create function public.check_rate_limit(p_key text, p_max_requests int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Opportunistic cleanup of this key's own stale hits, so the table
  -- doesn't grow unbounded across every distinct IP/route combination.
  delete from public.rate_limit_hits
  where key = p_key and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into v_count
  from public.rate_limit_hits
  where key = p_key and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into public.rate_limit_hits (key) values (p_key);
  return true;
end;
$$;
