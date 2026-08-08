-- Reusable payment schedule templates (e.g. "30/40/30 Standard"), managed in
-- Business Settings. Applying one to a job only pre-fills draft invoice
-- stages -- it never creates invoices directly, so nothing here is billing
-- data itself. Same admin-managed / active-user-viewable RLS shape as
-- labour_rate_types and the Materials Catalogue.
create table public.payment_schedule_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.payment_schedule_template_stages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.payment_schedule_templates (id) on delete cascade,
  label text not null,
  percentage numeric not null check (percentage > 0),
  sort_order integer not null default 0
);

create index payment_schedule_template_stages_template_id_idx
  on public.payment_schedule_template_stages (template_id);

alter table public.payment_schedule_templates enable row level security;
alter table public.payment_schedule_template_stages enable row level security;

create policy "active users can view payment schedule templates"
  on public.payment_schedule_templates for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage payment schedule templates"
  on public.payment_schedule_templates for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "active users can view payment schedule template stages"
  on public.payment_schedule_template_stages for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage payment schedule template stages"
  on public.payment_schedule_template_stages for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
