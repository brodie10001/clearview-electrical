-- Business-wide default payment terms, with an optional per-customer
-- override. Invoices snapshot whichever applies at creation time (see
-- invoices.payment_terms in a later migration) so this stays editable going
-- forward without altering already-issued invoices.
alter table public.business_settings
  add column default_payment_terms text not null default '7 days'
    check (default_payment_terms in ('Due on Receipt', '7 days', '14 days', '30 days'));

alter table public.customers
  add column payment_terms text
    check (payment_terms is null or payment_terms in ('Due on Receipt', '7 days', '14 days', '30 days'));
