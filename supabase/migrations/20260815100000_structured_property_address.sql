-- Splits properties.address (a single free-text field) into structured
-- street_address / suburb / state / postcode columns, so the new-property
-- form can be backed by an address-lookup API that returns those parts
-- separately.
--
-- `address` itself is kept as a column name -- every existing query/type
-- across the app selects/reads `properties.address` as a plain string, and
-- rather than touching dozens of call sites, `address` becomes a generated
-- column that recomposes the structured fields back into the same
-- "<street>, <suburb> <STATE> <postcode>" format the app already displays
-- everywhere. Existing display logic (property lists, job cards, PDFs,
-- public customer pages) keeps working unchanged.
--
-- The original free-text value is never discarded: it's preserved verbatim
-- in legacy_address, and street_address always falls back to the full
-- original text for any row this migration's regex can't confidently split
-- -- so nothing entered by Clearview is lost even where the parse fails.

alter table public.properties
  rename column address to legacy_address;

-- Only ever populated by this migration's one-time backfill below, as a
-- permanent audit trail of what was originally entered -- new properties
-- created after this migration never write to it, so it can't stay
-- required.
alter table public.properties
  alter column legacy_address drop not null;

alter table public.properties
  add column street_address text,
  add column suburb text,
  add column state text
    check (state is null or state in ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  add column postcode text
    check (postcode is null or postcode ~ '^\d{4}$');

-- Best-effort split of "<street>, <suburb> <STATE> <postcode>" -- the
-- format the app's old single free-text field steered users toward. Rows
-- that don't match this shape keep their full original text in
-- street_address untouched, with suburb/state/postcode left null.
with parsed as (
  select
    id,
    regexp_match(
      legacy_address,
      '^(.*),\s*([A-Za-z''\- ]+?)\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})\s*$',
      'i'
    ) as m
  from public.properties
)
update public.properties p
set
  street_address = btrim(parsed.m[1]),
  suburb = btrim(parsed.m[2]),
  state = upper(parsed.m[3]),
  postcode = parsed.m[4]
from parsed
where parsed.id = p.id and parsed.m is not null;

update public.properties
set street_address = legacy_address
where street_address is null;

alter table public.properties
  alter column street_address set not null;

-- concat_ws() is STABLE, not IMMUTABLE (collation-sensitive), so it can't
-- back a generated column -- this composes the same "<street>, <suburb>
-- <STATE> <postcode>" shape using only immutable operators/functions.
create function public.compose_property_address(
  street_address text, suburb text, state text, postcode text
) returns text
language sql
immutable
as $$
  select trim(both ', ' from
    coalesce(nullif(btrim(street_address), ''), '')
    || case
         when nullif(btrim(street_address), '') is not null
          and (nullif(btrim(suburb), '') is not null
               or nullif(btrim(state), '') is not null
               or nullif(btrim(postcode), '') is not null)
         then ', '
         else ''
       end
    || btrim(
         coalesce(nullif(btrim(suburb), ''), '')
         || case
              when nullif(btrim(suburb), '') is not null
               and (nullif(btrim(state), '') is not null or nullif(btrim(postcode), '') is not null)
              then ' '
              else ''
            end
         || coalesce(nullif(btrim(state), ''), '')
         || case
              when nullif(btrim(state), '') is not null and nullif(btrim(postcode), '') is not null
              then ' '
              else ''
            end
         || coalesce(nullif(btrim(postcode), ''), '')
       )
  )
$$;

alter table public.properties
  add column address text generated always as (
    public.compose_property_address(street_address, suburb, state, postcode)
  ) stored;
