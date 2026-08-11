-- Expense tracking, and the schema the real Finances dashboard needs to
-- compute Direct Job Costs vs. Business Expenses/Overhead. A job cost is
-- either a snapshotted quote/Price Book line (already exists) or an
-- expense with job_id set; an expense with job_id null is overhead. An
-- expense is never both.

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade
    default public.current_business_id(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index expense_categories_business_name_idx on public.expense_categories (business_id, name);

alter table public.expense_categories enable row level security;

create policy "active users can view expense categories"
  on public.expense_categories for select
  to authenticated
  using (public.is_active_user() and business_id = public.current_business_id());

-- Add-only: "just new rows, no separate system" -- categories are never
-- edited or removed here, so there's no update/delete policy.
create policy "active users can add expense categories"
  on public.expense_categories for insert
  to authenticated
  with check (public.is_active_user() and business_id = public.current_business_id());

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade
    default public.current_business_id(),
  date date not null default current_date,
  description text not null,
  -- Total, GST-inclusive. gst_amount defaults to amount/11 in the app when
  -- gst_included is set, but stays a plain column so a user can override it
  -- (e.g. an expense that mixes GST-free and GST items).
  amount numeric not null check (amount > 0),
  gst_included boolean not null default true,
  gst_amount numeric not null default 0 check (gst_amount >= 0),
  category_id uuid not null references public.expense_categories (id) on delete restrict,
  supplier_id uuid references public.suppliers (id) on delete set null,
  -- The field that decides direct-cost vs. overhead: set = this job's
  -- direct cost, null = general business overhead. Never both.
  job_id uuid references public.jobs (id) on delete set null,
  receipt_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index expenses_business_id_idx on public.expenses (business_id);
create index expenses_job_id_idx on public.expenses (job_id);
create index expenses_category_id_idx on public.expenses (category_id);
create index expenses_supplier_id_idx on public.expenses (supplier_id);
create index expenses_date_idx on public.expenses (date);

alter table public.expenses enable row level security;

create policy "active users can manage expenses"
  on public.expenses for all
  to authenticated
  using (public.is_active_user() and business_id = public.current_business_id())
  with check (public.is_active_user() and business_id = public.current_business_id());

-- Reuse the existing private `documents` Storage bucket for receipts
-- instead of a new bucket -- upload is already open to any active user, so
-- only the read policy needs extending (own business only, unlike the
-- feedback screenshot exception which is platform-admin only).
alter policy "active users can read document files" on storage.objects
  using (
    bucket_id = 'documents'
    and (
      exists (
        select 1 from public.documents d
        where d.file_url = storage.objects.name
          and d.business_id = public.current_business_id()
      )
      or (
        public.is_platform_admin()
        and exists (select 1 from public.feedback f where f.screenshot_url = storage.objects.name)
      )
      or exists (
        select 1 from public.expenses e
        where e.receipt_url = storage.objects.name
          and e.business_id = public.current_business_id()
      )
    )
  );

create function public.seed_new_business_expense_categories(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.expense_categories (business_id, name, is_default)
  select p_business_id, name, true from (values
    ('Materials'),
    ('Fuel/Vehicle'),
    ('Tools & Equipment'),
    ('Subcontractors'),
    ('Software/Subscriptions'),
    ('Insurance'),
    ('Advertising/Marketing'),
    ('Office/Admin'),
    ('Training/Licences'),
    ('Other')
  ) as seed(name);
end;
$$;

-- Backfill every business that predates this migration (same "grandfather
-- everyone who already exists" approach used for onboarding).
do $$
declare
  biz record;
begin
  for biz in select id from public.businesses loop
    perform public.seed_new_business_expense_categories(biz.id);
  end loop;
end $$;

-- Wire the seeding into signup too. Reproduces handle_new_user()'s exact
-- existing body (see 20260814092000_multi_tenancy.sql) plus one new call.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  business_name text;
begin
  business_name := new.raw_user_meta_data ->> 'business_name';
  if business_name is null or trim(business_name) = '' then
    raise exception 'signup requires a business_name in user metadata';
  end if;
  insert into public.businesses (name) values (trim(business_name))
    returning id into new_business_id;
  perform public.seed_new_business(new_business_id);
  perform public.seed_new_business_expense_categories(new_business_id);
  insert into public.profiles (id, email, full_name, business_id, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new_business_id, 'owner')
  on conflict (id) do nothing;
  return new;
end;
$$;
