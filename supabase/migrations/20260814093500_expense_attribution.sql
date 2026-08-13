-- Technicians got an "Add Expense" entry point on the Jobs list once
-- Finances was locked down to owners/admins (see
-- 20260814093400_restrict_finances_to_admin.sql), but had no way to see
-- what they'd logged afterward. Track who added each expense so a
-- technician can be shown just their own, without opening up everyone
-- else's spending to them the way the full Finances section would.
-- References public.profiles (not auth.users directly) so PostgREST can
-- embed it (profiles(full_name)) the same way test_records.tested_by does.
alter table public.expenses
  add column created_by uuid references public.profiles (id) on delete set null default auth.uid();

-- Existing rows predate this column -- there's no reliable way to attribute
-- them retroactively, so they stay null (shows up as "unattributed" to
-- admins, invisible to the per-user view, which is the honest outcome).

drop policy "active users can manage expenses" on public.expenses;

create policy "admins can view all expenses"
  on public.expenses for select
  to authenticated
  using (public.is_admin_user() and business_id = public.current_business_id());

create policy "users can view their own expenses"
  on public.expenses for select
  to authenticated
  using (created_by = auth.uid() and business_id = public.current_business_id());

create policy "active users can add expenses"
  on public.expenses for insert
  to authenticated
  with check (
    public.is_active_user()
    and business_id = public.current_business_id()
    and created_by = auth.uid()
  );

create policy "admins can update expenses"
  on public.expenses for update
  to authenticated
  using (public.is_admin_user() and business_id = public.current_business_id())
  with check (public.is_admin_user() and business_id = public.current_business_id());

create policy "admins can delete expenses"
  on public.expenses for delete
  to authenticated
  using (public.is_admin_user() and business_id = public.current_business_id());
