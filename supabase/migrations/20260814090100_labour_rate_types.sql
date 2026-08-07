create table public.labour_rate_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate_per_hour numeric not null check (rate_per_hour >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index labour_rate_types_name_idx on public.labour_rate_types (name);

-- Starting rates: only "Standard" was specified by the business; the rest
-- are reasonable placeholders and are editable from Business Settings.
insert into public.labour_rate_types (name, rate_per_hour, sort_order) values
  ('Standard', 120, 1),
  ('Apprentice', 70, 2),
  ('Call-out', 150, 3),
  ('After-hours', 180, 4),
  ('Emergency', 220, 5);

alter table public.labour_rate_types enable row level security;

create policy "active users can view labour rate types"
  on public.labour_rate_types for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage labour rate types"
  on public.labour_rate_types for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
