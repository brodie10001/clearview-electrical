-- People associated with properties/jobs (owners, tenants, builders, etc.),
-- kept separate from `customers` since one property can involve many people
-- who aren't the billing customer.
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text
);

create index contacts_name_idx on public.contacts (name);

alter table public.contacts enable row level security;

create policy "active users can manage contacts"
  on public.contacts for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
