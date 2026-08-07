-- 1:1 with properties: electrical infrastructure details for the site file.
create table public.property_electrical (
  property_id uuid primary key references public.properties (id) on delete cascade,
  switchboard_location text,
  switchboard_brand text,
  main_switch_rating text,
  phase_type text
    check (phase_type is null or phase_type in ('single_phase', 'three_phase')),
  consumer_mains_size text,
  meter_number text,
  solar_installed boolean not null default false,
  battery_installed boolean not null default false,
  generator_installed boolean not null default false,
  surge_protection boolean not null default false,
  ev_charger boolean not null default false,
  existing_rcds text,
  existing_rcbos text,
  main_earth_location text,
  men_location text
);

alter table public.property_electrical enable row level security;

create policy "active users can manage property electrical info"
  on public.property_electrical for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
