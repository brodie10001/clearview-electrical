-- Schema groundwork for New-Business Onboarding: the business-identity and
-- payment-details fields onboarding will collect, plus a way to know
-- whether a business has been through onboarding at all. No onboarding UI
-- yet -- just the columns, backfilled so nothing existing breaks.

alter table public.business_settings
  add column business_email text,
  add column business_phone text,
  add column business_address text,
  add column bank_bsb text,
  add column bank_account_name text,
  add column bank_account_number text,
  add column payment_instructions text;

-- null means "hasn't completed onboarding yet" -- the app treats that as
-- "show the onboarding flow" (skippable, so this can stay null indefinitely
-- without blocking anything). Clearview predates onboarding entirely and is
-- already fully configured, so it's backfilled as already-complete rather
-- than being shown a flow for details it already has.
alter table public.businesses add column onboarding_completed_at timestamptz;

update public.businesses
set onboarding_completed_at = now()
where name = 'Clearview Electrical Group';
