create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  billing_address text,
  notes text,
  created_at timestamptz not null default now()
);

create index customers_name_idx on public.customers (name);

alter table public.customers enable row level security;

create policy "active users can manage customers"
  on public.customers for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
