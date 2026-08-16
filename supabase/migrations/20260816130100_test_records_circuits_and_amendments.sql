-- Links test_records to the new property_circuits schedule, and adds the
-- amendment/audit trail columns the test sheet's locking design needs.
--
-- circuit_id is deliberately nullable: not every test belongs to a circuit
-- (an appliance test, a single RCD, a smoke alarm). The existing free-text
-- circuit_or_equipment column stays for exactly that case. No backfill --
-- existing rows keep circuit_id null rather than risk a silent
-- string-matching mistake on a compliance record.
alter table public.test_records
  add column circuit_id uuid references public.property_circuits (id) on delete restrict;

create index test_records_circuit_id_idx on public.test_records (circuit_id);

-- Once a job's certificate is Issued, existing test_records become
-- immutable (see assertTestRecordsUnlocked in job actions) -- mirroring
-- assertQuoteIsDraft's "never edit in place after the fact" pattern.
-- Correcting a locked row requires an explicit Amend action instead of an
-- in-place update: it inserts a new row with supersedes_id pointing at the
-- old one, and marks the old row is_superseded so the full history stays
-- visible and nothing is silently overwritten.
alter table public.test_records
  add column is_superseded boolean not null default false,
  add column supersedes_id uuid references public.test_records (id) on delete restrict,
  add column amended_reason text,
  add column amended_at timestamptz,
  add column amended_by uuid references public.profiles (id) on delete restrict;

create index test_records_supersedes_id_idx on public.test_records (supersedes_id);
