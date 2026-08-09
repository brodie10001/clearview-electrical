-- Performance audit follow-up: a few foreign key columns across V1-V6 never
-- got an index. Low impact at today's data volume (every table here is
-- small for a single-business app), but cheap and correct to add now rather
-- than only noticing once a table grows.
create index quote_line_items_labour_rate_type_id_idx
  on public.quote_line_items (labour_rate_type_id);

create index quote_line_items_source_catalogue_product_id_idx
  on public.quote_line_items (source_catalogue_product_id);

create index vehicle_stock_movements_created_by_idx
  on public.vehicle_stock_movements (created_by);
