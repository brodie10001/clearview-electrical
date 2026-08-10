-- Third PR in the New-Business Onboarding sequence: the guided wizard
-- itself. One remaining setting the wizard collects doesn't have a column
-- yet -- default quote validity -- plus a defensive belt-and-suspenders
-- backfill so "every pre-existing business is exempt from the wizard"
-- holds regardless of exactly which businesses existed when the previous
-- (name-matched, Clearview-only) backfill ran.

alter table public.business_settings
  add column default_quote_validity_days integer check (default_quote_validity_days > 0);

update public.businesses
set onboarding_completed_at = now()
where onboarding_completed_at is null;
