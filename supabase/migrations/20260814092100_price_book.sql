-- Price Book: flat-rate service items for the quote builder, so common jobs
-- can be added as one confirmed price instead of built up from labour +
-- materials each time. Reuses the existing Materials Catalogue for the
-- linked-materials composition rather than a parallel materials concept.

create table public.price_book_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict
    default public.current_business_id(),
  name text not null,
  customer_facing_description text not null,
  category text not null,
  default_sell_price numeric not null default 0 check (default_sell_price >= 0),
  -- Internal cost breakdown, for profitability visibility only -- never used
  -- to auto-calculate default_sell_price, which is always set by hand.
  labour_allowance_hours numeric check (labour_allowance_hours is null or labour_allowance_hours >= 0),
  labour_rate_type_id uuid references public.labour_rate_types (id) on delete set null,
  consumables_allowance numeric check (consumables_allowance is null or consumables_allowance >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index price_book_items_business_id_idx on public.price_book_items (business_id);

create trigger price_book_items_set_updated_at
  before update on public.price_book_items
  for each row execute function public.set_updated_at();

alter table public.price_book_items enable row level security;

create policy "active users can view price book items"
  on public.price_book_items for select
  to authenticated
  using (public.is_active_user() and business_id = public.current_business_id());

create policy "admins can manage price book items"
  on public.price_book_items for all
  to authenticated
  using (public.is_admin_user() and business_id = public.current_business_id())
  with check (public.is_admin_user() and business_id = public.current_business_id());

-- The materials that make up a price book item's internal cost estimate --
-- reuses catalogue_products directly (no parallel materials concept). This
-- is the item's *current* recipe, not a historical snapshot, so it cascades
-- if either side is deleted.
create table public.price_book_item_materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict
    default public.current_business_id(),
  price_book_item_id uuid not null references public.price_book_items (id) on delete cascade,
  catalogue_product_id uuid not null references public.catalogue_products (id) on delete cascade,
  quantity numeric not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index price_book_item_materials_business_id_idx on public.price_book_item_materials (business_id);
create index price_book_item_materials_item_id_idx on public.price_book_item_materials (price_book_item_id);

alter table public.price_book_item_materials enable row level security;

create policy "active users can view price book item materials"
  on public.price_book_item_materials for select
  to authenticated
  using (public.is_active_user() and business_id = public.current_business_id());

create policy "admins can manage price book item materials"
  on public.price_book_item_materials for all
  to authenticated
  using (public.is_admin_user() and business_id = public.current_business_id())
  with check (public.is_admin_user() and business_id = public.current_business_id());

-- A Price Book item added to a quote. Kept as its own table rather than a
-- new quote_line_items.line_type, since its rows carry a much wider,
-- differently-shaped snapshot (the internal cost estimate) that has no
-- equivalent on labour/material lines. Every quote total calculation and
-- customer-facing render has to sum/list this table alongside
-- quote_line_items -- see recalculateQuoteTotals and the PDF/public page.
--
-- The whole row is a permanent snapshot taken the moment it's added:
-- source_price_book_item_id is kept only for reporting, exactly like
-- quote_line_items.source_catalogue_product_id -- editing or re-pricing the
-- Price Book item later must never alter a quote that already used it.
create table public.quote_service_item_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict
    default public.current_business_id(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  source_price_book_item_id uuid references public.price_book_items (id) on delete set null,
  name text not null,
  customer_facing_description text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit_sell_price numeric not null check (unit_sell_price >= 0),
  line_total numeric not null default 0,
  -- Internal estimate, snapshotted at add-time. Never rendered on anything
  -- customer-facing (quote PDF, public quote page, invoices).
  labour_cost numeric not null default 0,
  materials_cost numeric not null default 0,
  consumables_cost numeric not null default 0,
  estimated_profit numeric not null default 0,
  estimated_margin_percent numeric not null default 0,
  created_at timestamptz not null default now()
);

create index quote_service_item_lines_business_id_idx on public.quote_service_item_lines (business_id);
create index quote_service_item_lines_quote_id_idx on public.quote_service_item_lines (quote_id);

alter table public.quote_service_item_lines enable row level security;

-- Matches quote_line_items' policy: any active user managing a quote can
-- add/edit/remove these, not just admins.
create policy "active users can manage quote service item lines"
  on public.quote_service_item_lines for all
  to authenticated
  using (public.is_active_user() and business_id = public.current_business_id())
  with check (public.is_active_user() and business_id = public.current_business_id());

-- ═══════════════════════════════════════════════════════════════
-- Starter Price Book for Clearview Electrical Group only. Sell prices are
-- realistic starting points from real market rates; the cost side
-- (labour_allowance_hours, labour_rate_type_id, consumables_allowance) is
-- left blank for the real cost breakdown to be filled in by hand -- never
-- fabricated. Not part of seed_new_business(): a brand-new business gets no
-- starter Price Book, same reasoning as why it gets no starter supplier.
-- ═══════════════════════════════════════════════════════════════
do $$
declare
  clearview_id uuid;
begin
  select id into clearview_id from public.businesses where name = 'Clearview Electrical Group';
  if clearview_id is null then
    return;
  end if;

  insert into public.price_book_items (business_id, name, customer_facing_description, category, default_sell_price)
  values
    (clearview_id, 'Install Double Power Point', 'Install Double Power Point', 'Power Points', 250),
    (clearview_id, 'Install LED Downlight', 'Install LED Downlight', 'Lighting', 72),
    (clearview_id, 'Install Smoke Alarm', 'Install Smoke Alarm', 'Safety & Compliance', 210),
    (clearview_id, 'Replace RCD', 'Replace RCD', 'Safety & Compliance', 210),
    (clearview_id, 'Install Ceiling Fan (remote)', 'Install Ceiling Fan (remote)', 'Fans', 275),
    (clearview_id, 'Digital TV Point', 'Digital TV Point', 'Data & TV', 180),
    (clearview_id, 'Security Camera Install', 'Security Camera Install', 'Security', 220),
    (clearview_id, 'Switchboard Replacement', 'Switchboard Replacement', 'Switchboard', 1750),
    (clearview_id, 'EV Charger Install (single phase)', 'EV Charger Install (single phase)', 'EV Charging', 900);
end $$;
