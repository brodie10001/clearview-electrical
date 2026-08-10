-- Quote/invoice numbering was a single global sequence + globally-unique
-- index, which only worked because Clearview was the only business. Now
-- that businesses are multi-tenant, replace it with a per-business counter
-- (stored on business_settings) so each business gets its own configurable
-- prefix + starting number, and one business's numbers never collide with
-- (or block) another's.

alter table public.business_settings
  add column quote_number_prefix text not null default 'QUO-',
  add column quote_number_next integer not null default 1,
  add column invoice_number_prefix text not null default 'INV-',
  add column invoice_number_next integer not null default 1;

-- Backfill each business's counter to continue after its own existing
-- quotes/invoices (generic per-business count, not hardcoded to any one
-- business, so this is correct no matter how many businesses exist by the
-- time this migration runs).
update public.business_settings bs
set quote_number_next = 1 + (
  select count(*) from public.quotes q where q.business_id = bs.business_id
);

update public.business_settings bs
set invoice_number_next = 1 + (
  select count(*) from public.invoices i where i.business_id = bs.business_id
);

-- Atomically claims and returns this business's next quote number,
-- formatted with its configured prefix. security definer + parameterless +
-- internally scoped to current_business_id() so it can only ever touch the
-- caller's own business_settings row, letting any active user (not just
-- admins, who are the only ones who can UPDATE business_settings directly)
-- create quotes.
create function public.next_quote_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  result_prefix text;
  result_number integer;
begin
  update public.business_settings
  set quote_number_next = quote_number_next + 1
  where business_id = public.current_business_id()
  returning quote_number_prefix, quote_number_next - 1 into result_prefix, result_number;

  return result_prefix || lpad(result_number::text, 4, '0');
end;
$$;

create function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  result_prefix text;
  result_number integer;
begin
  update public.business_settings
  set invoice_number_next = invoice_number_next + 1
  where business_id = public.current_business_id()
  returning invoice_number_prefix, invoice_number_next - 1 into result_prefix, result_number;

  return result_prefix || lpad(result_number::text, 4, '0');
end;
$$;

grant execute on function public.next_quote_number() to authenticated;
grant execute on function public.next_invoice_number() to authenticated;

-- Swap the column defaults from the old global-sequence expressions to the
-- new per-business functions -- createQuote/invoice creation code already
-- inserts without specifying the number column, so no app code changes.
alter table public.quotes alter column quote_number set default public.next_quote_number();
alter table public.invoices alter column invoice_number set default public.next_invoice_number();

-- Uniqueness must be scoped per business now, not global.
drop index if exists public.quotes_quote_number_idx;
drop index if exists public.invoices_invoice_number_idx;
create unique index quotes_business_quote_number_idx on public.quotes (business_id, quote_number);
create unique index invoices_business_invoice_number_idx on public.invoices (business_id, invoice_number);

-- The old global sequences are no longer referenced by anything.
drop sequence if exists public.quotes_number_seq;
drop sequence if exists public.invoices_number_seq;
