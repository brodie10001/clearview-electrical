-- Configurable pass/fail suggestion thresholds for the test sheet.
-- Deliberately per-business, not hardcoded: a wrong hardcoded threshold
-- that silently passes a failed circuit would be the worst bug this app
-- could ship. test_thresholds_confirmed starts false and the test sheet
-- must not render ANY suggested pass/fail while it's false, regardless of
-- whether a value is seeded below -- these are provisional defaults, not
-- confirmed regulatory figures, until Brodie reviews them.
--
-- No column at all for earth continuity or fault loop impedance max Zs --
-- both depend on run length/cable size/protective device rating and must
-- never be auto-suggested from a single hardcoded number.
-- Column defaults (not a separate backfill UPDATE) so both existing rows
-- and every future seed_new_business() insert land with the same
-- provisional values automatically.
alter table public.business_settings
  add column insulation_resistance_min_mohm numeric default 1,
  add column rcd_trip_time_max_ms numeric default 300,
  add column rcd_trip_current_max_ma numeric default 30,
  add column test_thresholds_confirmed boolean not null default false;
