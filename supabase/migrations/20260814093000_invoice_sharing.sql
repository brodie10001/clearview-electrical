-- Invoices had no way to send the customer a link at all -- only a manual
-- PDF download and a status dropdown the business had to flip themselves.
-- Same pattern as quote_public_tokens (see 20260814091300_quote_sharing.sql
-- and its business_id retrofit in 20260814092000_multi_tenancy.sql): one
-- cryptographically random, unguessable token per invoice, resolved to
-- exactly one invoice_id in application code via a service-role client
-- (an anonymous visitor has no Supabase session for RLS to key off).
create table public.invoice_public_tokens (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  token text not null,
  business_id uuid not null references public.businesses (id) on delete restrict
    default public.current_business_id(),
  created_at timestamptz not null default now()
);

create unique index invoice_public_tokens_invoice_id_idx on public.invoice_public_tokens (invoice_id);
create unique index invoice_public_tokens_token_idx on public.invoice_public_tokens (token);
create index invoice_public_tokens_business_id_idx on public.invoice_public_tokens (business_id);

alter table public.invoice_public_tokens enable row level security;

create policy "active users can manage invoice public tokens"
  on public.invoice_public_tokens for all
  to authenticated
  using (public.is_active_user() and business_id = public.current_business_id())
  with check (public.is_active_user() and business_id = public.current_business_id());
