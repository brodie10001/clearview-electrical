-- Technicians get a Team account but shouldn't see revenue, quote/invoice
-- line items, or payment amounts -- only owners/admins should. jobs.job_status
-- / jobs.invoice_status stay readable by everyone (they're plain columns on
-- jobs, not gated here) so a technician can still see a job is "Invoiced" or
-- "Paid" without seeing the underlying dollar figures. Public invoice/quote
-- pages (src/app/i, src/app/q) and the daily-digest edge function already
-- read through the service-role client, which bypasses RLS entirely, so
-- neither is affected by this.
alter policy "active users can manage quotes" on public.quotes
  using (public.is_admin_user() and business_id = public.current_business_id())
  with check (public.is_admin_user() and business_id = public.current_business_id());

alter policy "active users can manage invoices" on public.invoices
  using (public.is_admin_user() and business_id = public.current_business_id())
  with check (public.is_admin_user() and business_id = public.current_business_id());

alter policy "active users can manage payments" on public.payments
  using (public.is_admin_user() and business_id = public.current_business_id())
  with check (public.is_admin_user() and business_id = public.current_business_id());
