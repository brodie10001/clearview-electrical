-- V6: Suppliers, Vehicle Stock, Materials to Order.

-- ═══════════════════════════════════════════════════════════════
-- 1. Suppliers + multi-supplier pricing
-- ═══════════════════════════════════════════════════════════════
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index suppliers_name_idx on public.suppliers (name);

alter table public.suppliers enable row level security;

create policy "active users can view suppliers"
  on public.suppliers for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage suppliers"
  on public.suppliers for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

insert into public.suppliers (name) values ('MM Electrical');

create table public.supplier_product_prices (
  id uuid primary key default gen_random_uuid(),
  catalogue_product_id uuid not null references public.catalogue_products (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  supplier_sku text,
  cost_price numeric not null default 0 check (cost_price >= 0),
  -- True for rows created by the catalogue_products.supplier_sku backfill
  -- below, where MM Electrical was assumed rather than actually known --
  -- lets Settings surface these for a human to confirm or correct.
  needs_supplier_review boolean not null default false,
  last_updated timestamptz not null default now(),
  is_preferred boolean not null default false,
  created_at timestamptz not null default now()
);

create index supplier_product_prices_catalogue_product_id_idx
  on public.supplier_product_prices (catalogue_product_id);
create index supplier_product_prices_supplier_id_idx
  on public.supplier_product_prices (supplier_id);

-- One price row per product per supplier -- an import re-matching an
-- existing supplier_sku updates this row rather than duplicating it.
create unique index supplier_product_prices_product_supplier_idx
  on public.supplier_product_prices (catalogue_product_id, supplier_id);

-- At most one preferred supplier price per catalogue product.
create unique index supplier_product_prices_one_preferred_per_product
  on public.supplier_product_prices (catalogue_product_id)
  where is_preferred = true;

alter table public.supplier_product_prices enable row level security;

create policy "active users can view supplier product prices"
  on public.supplier_product_prices for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage supplier product prices"
  on public.supplier_product_prices for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- catalogue_products.cost_price is now a cache of the preferred supplier's
-- price -- kept in sync automatically here rather than in application code,
-- since it must stay correct no matter which path changes a price (manual
-- edit, import commit, switching which supplier is preferred). sell_price is
-- recalculated alongside it from cost x markup, for current/future quote
-- lines only -- quote_line_items already snapshots its own cost/markup/sell
-- price independently and is never touched by this.
create function public.sync_catalogue_product_cost_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  markup numeric;
begin
  select coalesce(cp.default_markup_percent, bs.default_material_markup_percent)
    into markup
  from public.catalogue_products cp, public.business_settings bs
  where cp.id = new.catalogue_product_id and bs.id = true;

  update public.catalogue_products
    set cost_price = new.cost_price,
        sell_price = round(new.cost_price * (1 + coalesce(markup, 0) / 100), 2)
    where id = new.catalogue_product_id;

  return new;
end;
$$;

create trigger supplier_product_prices_sync_cost_price
  after insert or update of cost_price, is_preferred on public.supplier_product_prices
  for each row
  when (new.is_preferred)
  execute function public.sync_catalogue_product_cost_price();

-- Unit of sale (each/m/box/etc.) -- needed for materials like cable that are
-- sold and quoted by the metre rather than as a discrete item.
alter table public.catalogue_products add column unit text not null default 'each';

-- Set by the price list import when it auto-creates a product under a
-- newly-created generic_material because the row's material name didn't
-- confidently match an existing one -- surfaced as a filterable flag in
-- Materials Catalogue settings so category cleanup can happen at the
-- business's own pace instead of blocking the import.
alter table public.catalogue_products add column needs_category_review boolean not null default false;

-- Backfill: one supplier_product_prices row per existing catalogue product,
-- under MM Electrical (the only supplier that's existed so far). No product
-- was ever actually attributed to a real supplier before this migration, so
-- every backfilled row is flagged for review rather than silently presented
-- as confirmed -- including ones with a supplier_sku already, since that SKU
-- was never actually verified against MM Electrical specifically.
insert into public.supplier_product_prices
  (catalogue_product_id, supplier_id, supplier_sku, cost_price, needs_supplier_review, is_preferred, last_updated)
select
  cp.id,
  (select id from public.suppliers where name = 'MM Electrical'),
  cp.supplier_sku,
  cp.cost_price,
  true,
  true,
  cp.updated_at
from public.catalogue_products cp;

alter table public.catalogue_products drop column supplier_sku;

-- ═══════════════════════════════════════════════════════════════
-- 2. Supplier price list import mappings
-- ═══════════════════════════════════════════════════════════════
create table public.supplier_import_mappings (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  source_column_name text not null,
  target_field text not null
    check (target_field in ('supplier_sku', 'material_name', 'cost_price', 'unit', 'brand', 'category')),
  created_at timestamptz not null default now()
);

-- One saved column per target field per supplier -- re-saving a mapping
-- (e.g. the supplier changed their export format) replaces it via upsert.
create unique index supplier_import_mappings_supplier_target_idx
  on public.supplier_import_mappings (supplier_id, target_field);

alter table public.supplier_import_mappings enable row level security;

create policy "admins can manage supplier import mappings"
  on public.supplier_import_mappings for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- ═══════════════════════════════════════════════════════════════
-- 3. Vehicle stock (manual for now -- no auto-deduction on job completion)
-- ═══════════════════════════════════════════════════════════════
create table public.vehicle_stock (
  id uuid primary key default gen_random_uuid(),
  catalogue_product_id uuid not null references public.catalogue_products (id) on delete cascade,
  quantity_on_hand numeric not null default 0,
  minimum_stock_level numeric not null default 0 check (minimum_stock_level >= 0),
  updated_at timestamptz not null default now()
);

create unique index vehicle_stock_catalogue_product_id_idx on public.vehicle_stock (catalogue_product_id);

create trigger vehicle_stock_set_updated_at
  before update on public.vehicle_stock
  for each row execute function public.set_updated_at();

alter table public.vehicle_stock enable row level security;

create policy "active users can manage vehicle stock"
  on public.vehicle_stock for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create table public.vehicle_stock_movements (
  id uuid primary key default gen_random_uuid(),
  catalogue_product_id uuid not null references public.catalogue_products (id) on delete cascade,
  movement_type text not null check (movement_type in ('Add', 'Remove', 'Adjust', 'Restock')),
  -- Signed delta applied to quantity_on_hand -- positive for Add/Restock,
  -- negative for Remove, and either sign for Adjust (new level minus old).
  -- quantity_on_hand is always derivable as the running sum of this column.
  quantity_change numeric not null,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index vehicle_stock_movements_catalogue_product_id_idx
  on public.vehicle_stock_movements (catalogue_product_id);
create index vehicle_stock_movements_created_at_idx
  on public.vehicle_stock_movements (created_at);

alter table public.vehicle_stock_movements enable row level security;

create policy "active users can manage vehicle stock movements"
  on public.vehicle_stock_movements for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
