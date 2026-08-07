-- Profiles & roles layer. Supabase Auth owns auth.users; this table extends it
-- with app-level identity/role info so the app is multi-user-ready even though
-- only one owner account exists today.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'technician')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'App-level user profile and role, one row per auth.users row.';

-- Keep a profile in sync automatically whenever a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies across the app: true if the calling user has an
-- active profile (i.e. is a recognised member of the business).
create function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

-- Helper used by RLS policies that need to restrict to the owner/admin roles
-- (e.g. finances, managing other users).
create function public.is_admin_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role in ('owner', 'admin')
  );
$$;

alter table public.profiles enable row level security;

create policy "profiles are readable by any active user"
  on public.profiles for select
  to authenticated
  using (public.is_active_user() or id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin_user())
  with check (id = auth.uid() or public.is_admin_user());

create policy "admins can add new profiles"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() or public.is_admin_user());

create policy "admins can remove profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin_user());
