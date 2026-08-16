-- Reusable circuit schedule stored against the property (not the job), so
-- entering a switchboard once makes it available to every future job at
-- that address. Trade-specific data, correctly kept out of core `properties`
-- per CLAUDE.md "Multi-trade platform architecture" -- same pattern as
-- property_electrical.
--
-- Circuits are archived (is_active), never deleted: test_records.circuit_id
-- references this table with `on delete restrict`, so a circuit with
-- historical test data can never be removed out from under those records.
create table public.property_circuits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict
    default public.current_business_id(),
  property_id uuid not null references public.properties (id) on delete cascade,
  -- Free text: properties with more than one board (main, sub, shed) need
  -- to distinguish circuits belonging to each. Null is fine for a single-board
  -- property.
  switchboard_ref text,
  -- Text, not int: real circuit numbering includes "4a", "L1", etc.
  circuit_number text not null,
  description text not null,
  protective_device_type text,
  protective_device_rating text,
  rcd_protected boolean not null default false,
  -- Free-text grouping key for circuits sharing one physical RCD (see the
  -- test sheet plan: multiple circuits can share an rcd_ref, in which case
  -- the RCD trip test is entered once and shown read-only on the others).
  -- Deliberately text, not yet a device_id FK -- a future protective_devices
  -- table can be introduced later by grouping distinct
  -- (switchboard_ref, rcd_ref) pairs without rewriting any existing row,
  -- since test_records keeps its own circuit_id regardless.
  rcd_ref text,
  cable_size text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_circuits_business_id_idx on public.property_circuits (business_id);
create index property_circuits_property_id_idx on public.property_circuits (property_id);

create trigger property_circuits_set_updated_at
  before update on public.property_circuits
  for each row execute function public.set_updated_at();

alter table public.property_circuits enable row level security;

create policy "active users can manage property circuits"
  on public.property_circuits for all
  to authenticated
  using (public.is_active_user() and business_id = public.current_business_id())
  with check (public.is_active_user() and business_id = public.current_business_id());
