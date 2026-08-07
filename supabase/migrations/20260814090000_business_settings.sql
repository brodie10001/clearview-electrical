-- Singleton table: one row holds business-wide branding/config. The
-- `id boolean primary key default true check (id)` trick enforces exactly
-- one row can ever exist (a second insert would need id=true again, which
-- collides with the existing primary key).
create table public.business_settings (
  id boolean primary key default true check (id),
  trading_name text,
  abn text,
  license_number text,
  logo_url text,
  logo_light_url text,
  logo_dark_url text,
  primary_color text not null default '#f59e0b',
  secondary_color text not null default '#0a0a0a',
  accent_color text not null default '#3b82f6',
  company_font text not null default 'Helvetica'
    check (company_font in ('Helvetica', 'Times-Roman', 'Courier')),
  email_signature text,
  quote_header text,
  invoice_footer text,
  default_material_markup_percent numeric not null default 30
    check (default_material_markup_percent >= 0),
  gst_registered boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.business_settings (id) values (true);

create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

alter table public.business_settings enable row level security;

create policy "active users can view business settings"
  on public.business_settings for select
  to authenticated
  using (public.is_active_user());

create policy "admins can update business settings"
  on public.business_settings for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Public bucket: logos need to be embeddable in generated PDFs and are not
-- sensitive, unlike the private `documents` bucket.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "anyone can view branding assets"
  on storage.objects for select
  to public
  using (bucket_id = 'branding');

create policy "admins can upload branding assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and public.is_admin_user());

create policy "admins can update branding assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and public.is_admin_user())
  with check (bucket_id = 'branding' and public.is_admin_user());

create policy "admins can delete branding assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'branding' and public.is_admin_user());
