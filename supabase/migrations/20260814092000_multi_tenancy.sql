-- V7: Multi-tenancy foundation.
--
-- Every table holding business-specific data gets a business_id column
-- scoped to a new `businesses` table, enforced by RLS -- not just hidden in
-- the UI. All existing data backfills onto one business ("Clearview
-- Electrical Group"); a fresh signup creates its own business with clean
-- starter defaults, never Clearview's real data.

-- ═══════════════════════════════════════════════════════════════
-- 1. businesses table
-- ═══════════════════════════════════════════════════════════════
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. profiles.business_id -- every user belongs to exactly one business.
--    Added before the RLS rewrite below since current_business_id() (the
--    function every other policy in this migration depends on) reads it.
-- ═══════════════════════════════════════════════════════════════
alter table public.profiles
  add column business_id uuid references public.businesses (id) on delete restrict;

insert into public.businesses (name) values ('Clearview Electrical Group');

update public.profiles
  set business_id = (select id from public.businesses limit 1)
  where business_id is null;

alter table public.profiles alter column business_id set not null;
create index profiles_business_id_idx on public.profiles (business_id);

-- Used by every RLS policy below: the calling user's own business. security
-- definer so it can read profiles regardless of profiles' own RLS (same
-- pattern already used by is_active_user()/is_admin_user()).
create function public.current_business_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid();
$$;

alter table public.profiles alter column business_id set default public.current_business_id();

alter table public.businesses enable row level security;

create policy "users can view their own business"
  on public.businesses for select
  to authenticated
  using (id = public.current_business_id());

create policy "admins can update their own business"
  on public.businesses for update
  to authenticated
  using (public.is_admin_user() and id = public.current_business_id())
  with check (public.is_admin_user() and id = public.current_business_id());

-- ═══════════════════════════════════════════════════════════════
-- 3. business_id on every other business-specific table, backfilled onto
--    Clearview, then locked to not null. Defaulting to
--    current_business_id() means existing app code inserting these rows
--    doesn't need to change -- the database fills in the right business
--    automatically, and RLS's with-check still verifies it independently.
-- ═══════════════════════════════════════════════════════════════
alter table public.catalogue_products add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.catalogue_products set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.catalogue_products alter column business_id set not null;
create index catalogue_products_business_id_idx on public.catalogue_products (business_id);

alter table public.compliance_document_templates add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.compliance_document_templates set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.compliance_document_templates alter column business_id set not null;
create index compliance_document_templates_business_id_idx on public.compliance_document_templates (business_id);

alter table public.compliance_documents add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.compliance_documents set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.compliance_documents alter column business_id set not null;
create index compliance_documents_business_id_idx on public.compliance_documents (business_id);

alter table public.contacts add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.contacts set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.contacts alter column business_id set not null;
create index contacts_business_id_idx on public.contacts (business_id);

alter table public.customers add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.customers set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.customers alter column business_id set not null;
create index customers_business_id_idx on public.customers (business_id);

alter table public.documents add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.documents set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.documents alter column business_id set not null;
create index documents_business_id_idx on public.documents (business_id);

alter table public.generic_materials add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.generic_materials set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.generic_materials alter column business_id set not null;
create index generic_materials_business_id_idx on public.generic_materials (business_id);

alter table public.invoices add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.invoices set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.invoices alter column business_id set not null;
create index invoices_business_id_idx on public.invoices (business_id);

alter table public.job_compliance_status add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.job_compliance_status set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.job_compliance_status alter column business_id set not null;
create index job_compliance_status_business_id_idx on public.job_compliance_status (business_id);

alter table public.job_variations add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.job_variations set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.job_variations alter column business_id set not null;
create index job_variations_business_id_idx on public.job_variations (business_id);

alter table public.job_visits add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.job_visits set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.job_visits alter column business_id set not null;
create index job_visits_business_id_idx on public.job_visits (business_id);

alter table public.jobs add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.jobs set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.jobs alter column business_id set not null;
create index jobs_business_id_idx on public.jobs (business_id);

alter table public.labour_rate_types add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.labour_rate_types set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.labour_rate_types alter column business_id set not null;
create index labour_rate_types_business_id_idx on public.labour_rate_types (business_id);

alter table public.payment_schedule_template_stages add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.payment_schedule_template_stages set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.payment_schedule_template_stages alter column business_id set not null;
create index payment_schedule_template_stages_business_id_idx on public.payment_schedule_template_stages (business_id);

alter table public.payment_schedule_templates add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.payment_schedule_templates set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.payment_schedule_templates alter column business_id set not null;
create index payment_schedule_templates_business_id_idx on public.payment_schedule_templates (business_id);

alter table public.payments add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.payments set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.payments alter column business_id set not null;
create index payments_business_id_idx on public.payments (business_id);

alter table public.personal_note_items add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.personal_note_items set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.personal_note_items alter column business_id set not null;
create index personal_note_items_business_id_idx on public.personal_note_items (business_id);

alter table public.properties add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.properties set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.properties alter column business_id set not null;
create index properties_business_id_idx on public.properties (business_id);

alter table public.property_access add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.property_access set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.property_access alter column business_id set not null;
create index property_access_business_id_idx on public.property_access (business_id);

alter table public.property_contacts add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.property_contacts set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.property_contacts alter column business_id set not null;
create index property_contacts_business_id_idx on public.property_contacts (business_id);

alter table public.property_electrical add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.property_electrical set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.property_electrical alter column business_id set not null;
create index property_electrical_business_id_idx on public.property_electrical (business_id);

alter table public.quote_activity add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.quote_activity set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.quote_activity alter column business_id set not null;
create index quote_activity_business_id_idx on public.quote_activity (business_id);

alter table public.quote_line_items add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.quote_line_items set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.quote_line_items alter column business_id set not null;
create index quote_line_items_business_id_idx on public.quote_line_items (business_id);

alter table public.quote_public_tokens add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.quote_public_tokens set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.quote_public_tokens alter column business_id set not null;
create index quote_public_tokens_business_id_idx on public.quote_public_tokens (business_id);

alter table public.quote_versions add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.quote_versions set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.quote_versions alter column business_id set not null;
create index quote_versions_business_id_idx on public.quote_versions (business_id);

alter table public.quotes add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.quotes set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.quotes alter column business_id set not null;
create index quotes_business_id_idx on public.quotes (business_id);

alter table public.supplier_import_mappings add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.supplier_import_mappings set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.supplier_import_mappings alter column business_id set not null;
create index supplier_import_mappings_business_id_idx on public.supplier_import_mappings (business_id);

alter table public.supplier_product_prices add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.supplier_product_prices set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.supplier_product_prices alter column business_id set not null;
create index supplier_product_prices_business_id_idx on public.supplier_product_prices (business_id);

alter table public.suppliers add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.suppliers set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.suppliers alter column business_id set not null;
create index suppliers_business_id_idx on public.suppliers (business_id);

alter table public.test_records add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.test_records set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.test_records alter column business_id set not null;
create index test_records_business_id_idx on public.test_records (business_id);

alter table public.test_types add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.test_types set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.test_types alter column business_id set not null;
create index test_types_business_id_idx on public.test_types (business_id);

alter table public.vehicle_stock add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.vehicle_stock set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.vehicle_stock alter column business_id set not null;
create index vehicle_stock_business_id_idx on public.vehicle_stock (business_id);

alter table public.vehicle_stock_movements add column business_id uuid references public.businesses (id) on delete restrict default public.current_business_id();
update public.vehicle_stock_movements set business_id = (select id from public.businesses limit 1) where business_id is null;
alter table public.vehicle_stock_movements alter column business_id set not null;
create index vehicle_stock_movements_business_id_idx on public.vehicle_stock_movements (business_id);
-- ═══════════════════════════════════════════════════════════════
-- 4. Reference-data uniqueness was global (one "Standard" rate, one
--    "Single GPO" material, one "MM Electrical" supplier, ever); now that
--    every business gets the same starter names, it must be per-business.
-- ═══════════════════════════════════════════════════════════════
drop index public.labour_rate_types_name_idx;
create unique index labour_rate_types_business_name_idx on public.labour_rate_types (business_id, name);

drop index public.generic_materials_name_idx;
create unique index generic_materials_business_name_idx on public.generic_materials (business_id, name);

drop index public.test_types_name_idx;
create unique index test_types_business_name_idx on public.test_types (business_id, name);

drop index public.suppliers_name_idx;
create unique index suppliers_business_name_idx on public.suppliers (business_id, name);

-- quote_number / invoice_number stay globally unique -- deliberately not
-- changed to per-business sequences in this pass (a bigger, separate
-- change); flagged in the follow-up notes.

-- ═══════════════════════════════════════════════════════════════
-- 5. business_settings: was a global singleton (id boolean, always `true`,
--    a second row structurally impossible). Multi-tenancy needs one row
--    per business, so its primary key becomes a real uuid.
-- ═══════════════════════════════════════════════════════════════
alter table public.business_settings drop constraint business_settings_pkey;
alter table public.business_settings drop constraint business_settings_id_check;
alter table public.business_settings alter column id drop default;
alter table public.business_settings alter column id type uuid using gen_random_uuid();
alter table public.business_settings alter column id set default gen_random_uuid();
alter table public.business_settings add primary key (id);

alter table public.business_settings
  add column business_id uuid references public.businesses (id) on delete restrict;
update public.business_settings
  set business_id = (select id from public.businesses limit 1)
  where business_id is null;
alter table public.business_settings alter column business_id set not null;
alter table public.business_settings add constraint business_settings_business_id_key unique (business_id);
create index business_settings_business_id_idx on public.business_settings (business_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. RLS: add the business_id condition to every existing policy. Same
--    intent as before (active users view/manage, admins manage
--    reference data) -- just also scoped to the caller's own business.
-- ═══════════════════════════════════════════════════════════════
alter policy "active users can manage customers" on public.customers using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage properties" on public.properties using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage property access info" on public.property_access using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage property electrical info" on public.property_electrical using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage contacts" on public.contacts using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage property contacts" on public.property_contacts using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage jobs" on public.jobs using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage documents" on public.documents using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can view business settings" on public.business_settings using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can update business settings" on public.business_settings using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can view labour rate types" on public.labour_rate_types using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage labour rate types" on public.labour_rate_types using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can manage quotes" on public.quotes using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage quote line items" on public.quote_line_items using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage job visits" on public.job_visits using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can view generic materials" on public.generic_materials using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage generic materials" on public.generic_materials using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can view catalogue products" on public.catalogue_products using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage catalogue products" on public.catalogue_products using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can manage job variations" on public.job_variations using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can view payment schedule templates" on public.payment_schedule_templates using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage payment schedule templates" on public.payment_schedule_templates using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can view payment schedule template stages" on public.payment_schedule_template_stages using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage payment schedule template stages" on public.payment_schedule_template_stages using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can manage invoices" on public.invoices using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage payments" on public.payments using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage quote versions" on public.quote_versions using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage quote public tokens" on public.quote_public_tokens using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage quote activity" on public.quote_activity using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can view compliance document templates" on public.compliance_document_templates using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage compliance document templates" on public.compliance_document_templates using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can manage compliance documents" on public.compliance_documents using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can view test types" on public.test_types using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage test types" on public.test_types using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can manage test records" on public.test_records using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage job compliance status" on public.job_compliance_status using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can view suppliers" on public.suppliers using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage suppliers" on public.suppliers using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can view supplier product prices" on public.supplier_product_prices using (public.is_active_user() and business_id = public.current_business_id());
alter policy "admins can manage supplier product prices" on public.supplier_product_prices using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "admins can manage supplier import mappings" on public.supplier_import_mappings using (public.is_admin_user() and business_id = public.current_business_id()) with check (public.is_admin_user() and business_id = public.current_business_id());
alter policy "active users can manage vehicle stock" on public.vehicle_stock using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
alter policy "active users can manage vehicle stock movements" on public.vehicle_stock_movements using (public.is_active_user() and business_id = public.current_business_id()) with check (public.is_active_user() and business_id = public.current_business_id());
-- profiles' policies reference id = auth.uid() as an escape hatch (a user
-- can always see/touch their own row) alongside the business-scoped checks.
alter policy "profiles are readable by any active user" on public.profiles
  using (
    (public.is_active_user() and business_id = public.current_business_id())
    or id = auth.uid()
  );

alter policy "users can update their own profile" on public.profiles
  using (id = auth.uid() or (public.is_admin_user() and business_id = public.current_business_id()))
  with check (id = auth.uid() or (public.is_admin_user() and business_id = public.current_business_id()));

alter policy "admins can add new profiles" on public.profiles
  with check (id = auth.uid() or (public.is_admin_user() and business_id = public.current_business_id()));

alter policy "admins can remove profiles" on public.profiles
  using (public.is_admin_user() and business_id = public.current_business_id());

-- ═══════════════════════════════════════════════════════════════
-- 7. Storage: the `documents` bucket policy only ever checked
--    is_active_user() -- any authenticated user, from any business, could
--    read/write any file in it directly via the Storage API regardless of
--    table-level RLS. documents.file_url stores the exact object path
--    (see quick-photo-dialog.tsx / offline-photo-queue.ts), so read/write
--    access is now scoped by joining back to the owning documents row's
--    business_id. Upload (insert) is intentionally left open to any active
--    user: at upload time no documents row exists yet to join against, and
--    an orphaned upload with no matching documents row is unreadable by
--    anyone once the read policy below is in place -- so this can't be
--    used to read another business's files, only to write an unreferenced
--    object nobody (including the uploader) can read back without also
--    creating their own business-scoped documents row.
-- ═══════════════════════════════════════════════════════════════
alter policy "active users can read document files" on storage.objects
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_url = storage.objects.name
        and d.business_id = public.current_business_id()
    )
  );

alter policy "active users can update document files" on storage.objects
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_url = storage.objects.name
        and d.business_id = public.current_business_id()
    )
  )
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_url = storage.objects.name
        and d.business_id = public.current_business_id()
    )
  );

alter policy "active users can delete document files" on storage.objects
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_url = storage.objects.name
        and d.business_id = public.current_business_id()
    )
  );

-- The `branding` bucket stays intentionally public-read (logos must be
-- embeddable in publicly-shared quote pages/PDFs with no auth) and
-- admin-only write -- not tightened to per-business in this pass. Not a
-- confidentiality issue (a business's logo isn't secret, and it's already
-- exposed on their own public quote links); the only residual gap is one
-- business's admin being able to overwrite another's logo *file* if they
-- guessed its exact storage path, which the business_settings row it's
-- referenced from is itself already correctly scoped against. Flagged in
-- the follow-up notes rather than solved here with a fragile path-matching
-- hack (business_settings stores full public URLs, not raw paths).

-- ═══════════════════════════════════════════════════════════════
-- 8. New-business starter data. Same shape as the original V1/V6 seed
--    (materials catalogue, compliance templates, test types) so a fresh
--    signup isn't starting from a completely empty catalogue -- but
--    labour rates are generic placeholders at $0, never Clearview's real
--    $120/hour pricing, and there is no starter supplier (MM Electrical is
--    Clearview's real supplier relationship, not a generic default).
--    Business settings starts fully blank (no trading name/ABN/logo) with
--    GST off, matching the same defaults the column definitions already
--    use -- nothing here is Clearview-specific.
-- ═══════════════════════════════════════════════════════════════
create function public.seed_new_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_settings (business_id) values (p_business_id);

  insert into public.labour_rate_types (business_id, name, rate_per_hour, sort_order) values
    (p_business_id, 'Standard', 0, 1),
    (p_business_id, 'Apprentice', 0, 2),
    (p_business_id, 'Call-out', 0, 3),
    (p_business_id, 'After-hours', 0, 4),
    (p_business_id, 'Emergency', 0, 5);

  insert into public.generic_materials (business_id, name, category)
  select p_business_id, name, category from (values
    ('Single GPO', 'Power Points'),
    ('Double GPO', 'Power Points'),
    ('Light Point', 'Lighting'),
    ('LED Downlight', 'Lighting'),
    ('Circuit Breaker', 'Switchboard/Protection'),
    ('Safety Switch/RCD', 'Switchboard/Protection'),
    ('RCBO', 'Switchboard/Protection'),
    ('2.5mm TPS Cable', 'Cable'),
    ('1.5mm TPS Cable', 'Cable')
  ) as seed(name, category);

  insert into public.catalogue_products (business_id, generic_material_id, brand, product_name)
  select p_business_id, gm.id, seed.brand, seed.product_name
  from public.generic_materials gm
  join (values
    ('Single GPO', 'Clipsal', 'Iconic'),
    ('Single GPO', 'Clipsal', 'Classic'),
    ('Single GPO', 'HPM', 'Excel'),
    ('Double GPO', 'Clipsal', 'Iconic'),
    ('Double GPO', 'Clipsal', 'Classic'),
    ('Double GPO', 'HPM', 'Excel'),
    ('Light Point', 'Clipsal', 'Ceiling Rose'),
    ('Light Point', 'HPM', 'Batten Holder'),
    ('LED Downlight', 'Brilliant', 'LED Downlight'),
    ('LED Downlight', 'Atom', 'LED Downlight'),
    ('LED Downlight', 'HPM', 'LED Downlight'),
    ('Circuit Breaker', 'Clipsal', 'MCB'),
    ('Circuit Breaker', 'Hager', 'MCB'),
    ('Circuit Breaker', 'Schneider Electric', 'MCB'),
    ('Safety Switch/RCD', 'Clipsal', 'RCD'),
    ('Safety Switch/RCD', 'Hager', 'RCD'),
    ('Safety Switch/RCD', 'Schneider Electric', 'RCD'),
    ('RCBO', 'Clipsal', 'RCBO'),
    ('RCBO', 'Hager', 'RCBO'),
    ('RCBO', 'Schneider Electric', 'RCBO'),
    ('2.5mm TPS Cable', 'Olex', '2.5mm TPS'),
    ('2.5mm TPS Cable', 'Prysmian', '2.5mm TPS'),
    ('1.5mm TPS Cable', 'Olex', '1.5mm TPS'),
    ('1.5mm TPS Cable', 'Prysmian', '1.5mm TPS')
  ) as seed(material_name, brand, product_name)
    on seed.material_name = gm.name and gm.business_id = p_business_id;

  insert into public.compliance_document_templates (business_id, name, category, field_schema) values
  (
    p_business_id,
    'Electrical Safety Certificate',
    'Electrical Safety Certificate',
    '[
      {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
      {"key": "installation_type", "label": "Installation type", "type": "select", "required": true, "options": ["New Installation", "Alteration", "Repair", "Testing Only"]},
      {"key": "compliant", "label": "Installation complies with AS/NZS 3000", "type": "checkbox", "required": true},
      {"key": "defects_noted", "label": "Defects noted", "type": "textarea", "required": false},
      {"key": "electrician_license_number", "label": "Electrician licence number", "type": "text", "required": true},
      {"key": "date_of_inspection", "label": "Date of inspection", "type": "date", "required": true}
    ]'::jsonb
  ),
  (
    p_business_id,
    'Notice of Completion',
    'Notice of Completion',
    '[
      {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
      {"key": "date_completed", "label": "Date completed", "type": "date", "required": true},
      {"key": "contractor_license_number", "label": "Contractor licence number", "type": "text", "required": true},
      {"key": "notes", "label": "Notes", "type": "textarea", "required": false}
    ]'::jsonb
  ),
  (
    p_business_id,
    'Preliminary Notice',
    'Preliminary Notice',
    '[
      {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
      {"key": "estimated_start_date", "label": "Estimated start date", "type": "date", "required": true},
      {"key": "estimated_completion_date", "label": "Estimated completion date", "type": "date", "required": false},
      {"key": "notes", "label": "Notes", "type": "textarea", "required": false}
    ]'::jsonb
  );

  insert into public.test_types (business_id, name, default_unit, is_custom) values
    (p_business_id, 'Earth Continuity', 'Ω', false),
    (p_business_id, 'Insulation Resistance', 'MΩ', false),
    (p_business_id, 'Polarity', null, false),
    (p_business_id, 'RCD/RCBO Testing', 'ms', false),
    (p_business_id, 'Fault Loop/Earth Fault Loop', 'Ω', false),
    (p_business_id, 'Voltage', 'V', false),
    (p_business_id, 'Phase Sequence', null, false),
    (p_business_id, 'Other/Custom', null, true);
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 9. Sign-up: a new auth user always creates a brand new business (this
--    app has no "invite a colleague" flow yet -- that's a separate future
--    feature, not this one). The business name travels in signUp()'s
--    metadata as `business_name`; its absence is treated as a
--    configuration error rather than silently creating a profile with no
--    business, since business_id is not-null everywhere.
-- ═══════════════════════════════════════════════════════════════
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

  insert into public.profiles (id, email, full_name, business_id, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new_business_id, 'owner')
  on conflict (id) do nothing;

  return new;
end;
$$;
