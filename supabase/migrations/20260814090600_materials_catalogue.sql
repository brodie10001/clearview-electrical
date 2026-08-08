-- Materials Catalogue: a generic material (e.g. "Double GPO") groups
-- multiple branded catalogue_products (e.g. Clipsal Iconic, HPM Excel), one
-- of which can be marked preferred. Deliberately trade-agnostic tables (see
-- CLAUDE.md "Multi-trade platform architecture") -- only seed data below
-- says "electrical".
create table public.generic_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index generic_materials_name_idx on public.generic_materials (name);
create index generic_materials_category_idx on public.generic_materials (category);

create table public.catalogue_products (
  id uuid primary key default gen_random_uuid(),
  generic_material_id uuid not null references public.generic_materials (id) on delete cascade,
  brand text,
  product_name text,
  supplier_sku text,
  cost_price numeric not null default 0 check (cost_price >= 0),
  -- Falls back to business_settings.default_material_markup_percent when null.
  default_markup_percent numeric check (default_markup_percent is null or default_markup_percent >= 0),
  -- Normally cost_price * (1 + markup/100), but stored (not generated) so it
  -- stays manually overridable independent of cost/markup.
  sell_price numeric not null default 0 check (sell_price >= 0),
  is_preferred boolean not null default false,
  is_custom boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalogue_products_generic_material_id_idx on public.catalogue_products (generic_material_id);

-- At most one preferred product per generic material.
create unique index catalogue_products_one_preferred_per_material
  on public.catalogue_products (generic_material_id)
  where is_preferred = true;

create trigger catalogue_products_set_updated_at
  before update on public.catalogue_products
  for each row execute function public.set_updated_at();

alter table public.generic_materials enable row level security;
alter table public.catalogue_products enable row level security;

-- All active users can browse the catalogue while quoting; only admins
-- manage it, matching labour_rate_types' policy shape.
create policy "active users can view generic materials"
  on public.generic_materials for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage generic materials"
  on public.generic_materials for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "active users can view catalogue products"
  on public.catalogue_products for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage catalogue products"
  on public.catalogue_products for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Quote line items: add quantity + independent sell price so material lines
-- become qty x sell_price, and an optional link back to the catalogue
-- product a line was sourced from (for future reporting only -- quotes
-- always display/calculate from their own stored snapshot, never a live
-- catalogue reference).
alter table public.quote_line_items add column quantity numeric;
alter table public.quote_line_items add column sell_price numeric;
alter table public.quote_line_items
  add column source_catalogue_product_id uuid references public.catalogue_products (id) on delete set null;

-- Backfill existing material lines: implicit quantity of 1, sell_price
-- equal to the old (already qty-1) line_total.
update public.quote_line_items
  set quantity = 1, sell_price = line_total
  where line_type = 'material';

alter table public.quote_line_items drop constraint quote_line_items_check;
alter table public.quote_line_items add constraint quote_line_items_check check (
  (line_type = 'labour' and hours is not null and rate_per_hour is not null)
  or
  (line_type = 'material' and cost is not null and quantity is not null and sell_price is not null)
);

-- Starter catalogue: real generic material types across common categories,
-- each with 2-3 real branded product options. Prices are intentionally left
-- at 0 (never fabricate real cost data) -- the business enters real cost
-- prices and chooses a preferred product per material from Settings.
insert into public.generic_materials (name, category) values
  ('Single GPO', 'Power Points'),
  ('Double GPO', 'Power Points'),
  ('Light Point', 'Lighting'),
  ('LED Downlight', 'Lighting'),
  ('Circuit Breaker', 'Switchboard/Protection'),
  ('Safety Switch/RCD', 'Switchboard/Protection'),
  ('RCBO', 'Switchboard/Protection'),
  ('2.5mm TPS Cable', 'Cable'),
  ('1.5mm TPS Cable', 'Cable');

insert into public.catalogue_products (generic_material_id, brand, product_name)
select id, brand, product_name
from public.generic_materials
join (values
  ('Single GPO', 'Clipsal', 'Iconic'),
  ('Single GPO', 'Clipsal', 'Classic'),
  ('Single GPO', 'HPM', 'Excel'),
  ('Double GPO', 'Clipsal', 'Iconic'),
  ('Double GPO', 'Clipsal', 'Classic'),
  ('Double GPO', 'HPM', 'Excel'),
  ('Light Point', 'Clipsal', 'Ceiling Rose'),
  ('Light Point', 'HPM', 'Batten Holder'),
  ('LED Downlight', 'Brilliant', 'LED Downlight'),
  ('LED Downlight', 'Atom', 'LED Downlight'),
  ('LED Downlight', 'HPM', 'LED Downlight'),
  ('Circuit Breaker', 'Clipsal', 'MCB'),
  ('Circuit Breaker', 'Hager', 'MCB'),
  ('Circuit Breaker', 'Schneider Electric', 'MCB'),
  ('Safety Switch/RCD', 'Clipsal', 'RCD'),
  ('Safety Switch/RCD', 'Hager', 'RCD'),
  ('Safety Switch/RCD', 'Schneider Electric', 'RCD'),
  ('RCBO', 'Clipsal', 'RCBO'),
  ('RCBO', 'Hager', 'RCBO'),
  ('RCBO', 'Schneider Electric', 'RCBO'),
  ('2.5mm TPS Cable', 'Olex', '2.5mm TPS'),
  ('2.5mm TPS Cable', 'Prysmian', '2.5mm TPS'),
  ('1.5mm TPS Cable', 'Olex', '1.5mm TPS'),
  ('1.5mm TPS Cable', 'Prysmian', '1.5mm TPS')
) as seed(material_name, brand, product_name) on seed.material_name = public.generic_materials.name;
