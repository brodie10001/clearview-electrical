-- Lets a customer acknowledge or decline an invoice from the public share
-- link (see src/app/i/[token]/page.tsx), same idea as a quote's
-- Accepted/Rejected activity but deliberately NOT reusing invoices.status
-- or triggering any payment record: whether a customer clicks a button and
-- whether money has actually arrived are two completely different facts,
-- and conflating them would let a "paid" invoice exist with $0 actually
-- received. Payments stay exactly as before -- a business-recorded fact,
-- never derived from this.
alter table public.invoices
  add column customer_response text check (customer_response in ('Accepted', 'Declined')),
  add column customer_response_at timestamptz;
