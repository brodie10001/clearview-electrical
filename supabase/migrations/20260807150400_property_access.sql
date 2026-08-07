-- 1:1 with properties: site-access information a technician needs before a visit.
create table public.property_access (
  property_id uuid primary key references public.properties (id) on delete cascade,
  gate_code text,
  alarm_instructions text,
  lockbox_location text,
  parking_instructions text,
  pets_notes text,
  hazards_notes text,
  ceiling_access_notes text,
  roof_access_notes text,
  restricted_areas_notes text
);

alter table public.property_access enable row level security;

create policy "active users can manage property access info"
  on public.property_access for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
