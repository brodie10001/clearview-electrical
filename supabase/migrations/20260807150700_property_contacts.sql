-- Join table: which contacts are associated with a property, and in what role.
create table public.property_contacts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role text not null check (
    role in (
      'owner',
      'tenant',
      'property_manager',
      'builder',
      'site_supervisor',
      'accounts_contact',
      'emergency_contact'
    )
  ),
  unique (property_id, contact_id, role)
);

create index property_contacts_property_id_idx on public.property_contacts (property_id);
create index property_contacts_contact_id_idx on public.property_contacts (contact_id);

alter table public.property_contacts enable row level security;

create policy "active users can manage property contacts"
  on public.property_contacts for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
