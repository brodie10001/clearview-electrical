-- First-run in-app product tour, separate from the New-Business Onboarding
-- wizard (businesses.onboarding_completed_at). This is per-*user*, not
-- per-business: anyone who ever logs in for the first time -- including
-- someone invited into an already-onboarded business much later -- should
-- see the tour once for themselves, regardless of whether their business
-- already finished setup.
alter table public.profiles
  add column tour_completed_at timestamptz;
