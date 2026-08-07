create table public.properties (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  address text not null,
  gps_lat double precision,
  gps_lng double precision,
  property_type text not null
    check (property_type in ('residential', 'commercial', 'industrial')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index properties_customer_id_idx on public.properties (customer_id);
create index properties_status_idx on public.properties (status);

alter table public.properties enable row level security;

create policy "active users can manage properties"
  on public.properties for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
