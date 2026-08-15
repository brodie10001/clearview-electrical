-- sync_catalogue_product_cost_price() still joined to business_settings via
-- `bs.id = true` -- a leftover from when business_settings.id was a boolean
-- singleton flag, before the multi-tenancy migration converted it to a uuid
-- (20260814092000_multi_tenancy.sql:260-265) without updating this trigger
-- to match. `uuid = boolean` is a hard type error, so this has been
-- throwing on every supplier_product_prices insert/update that sets
-- is_preferred = true ever since -- found while locally re-verifying the
-- new catalogue merge tooling, which exercises this exact trigger.
--
-- Fixed by joining through catalogue_products.business_id (added by the
-- same multi-tenancy migration) instead of the removed boolean flag.
create or replace function public.sync_catalogue_product_cost_price()
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
  from public.catalogue_products cp
  join public.business_settings bs on bs.business_id = cp.business_id
  where cp.id = new.catalogue_product_id;

  update public.catalogue_products
    set cost_price = new.cost_price,
        sell_price = round(new.cost_price * (1 + coalesce(markup, 0) / 100), 2)
    where id = new.catalogue_product_id;

  return new;
end;
$$;
