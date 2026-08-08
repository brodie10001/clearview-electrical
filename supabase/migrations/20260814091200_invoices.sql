-- Sequential, never-reused invoice numbers, same pattern as quotes.
create sequence public.invoices_number_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  invoice_number text not null default
    ('INV-' || lpad(nextval('public.invoices_number_seq')::text, 4, '0')),
  -- "Deposit" / "Progress Payment 1" / "Final Payment" / null for a simple
  -- one-invoice job.
  stage_label text,
  amount_type text not null check (amount_type in ('percentage', 'fixed')),
  percentage numeric,
  -- Always stored explicitly and locked in at creation, even when derived
  -- from a percentage of the revised contract value at that moment -- later
  -- variations must never silently change an already-created invoice.
  amount numeric not null check (amount >= 0),
  issue_date date not null default current_date,
  payment_terms text not null
    check (payment_terms in ('Due on Receipt', '7 days', '14 days', '30 days')),
  due_date date not null,
  status text not null default 'Draft'
    check (status in ('Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Void', 'Written Off')),
  created_at timestamptz not null default now()
);

create index invoices_job_id_idx on public.invoices (job_id);
create unique index invoices_invoice_number_idx on public.invoices (invoice_number);

alter table public.invoices enable row level security;

create policy "active users can manage invoices"
  on public.invoices for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_date date not null default current_date,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create index payments_invoice_id_idx on public.payments (invoice_id);

alter table public.payments enable row level security;

create policy "active users can manage payments"
  on public.payments for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- Recompute one invoice's status from its recorded payments vs its locked
-- amount. Draft/Void/Written Off are manual/frozen states and are never
-- auto-transitioned by payments.
create function public.recompute_invoice_status(p_invoice_id uuid)
returns void
language plpgsql
as $$
declare
  v_amount numeric;
  v_status text;
  v_paid numeric;
begin
  select amount, status into v_amount, v_status
  from public.invoices where id = p_invoice_id;

  if v_status is null or v_status in ('Draft', 'Void', 'Written Off') then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments where invoice_id = p_invoice_id;

  if v_amount > 0 and v_paid >= v_amount then
    update public.invoices set status = 'Paid' where id = p_invoice_id and status <> 'Paid';
  elsif v_paid > 0 then
    update public.invoices set status = 'Partially Paid'
      where id = p_invoice_id and status <> 'Partially Paid';
  elsif v_status in ('Paid', 'Partially Paid') then
    -- All payments removed: fall back to Sent rather than leaving a status
    -- that no longer reflects reality.
    update public.invoices set status = 'Sent' where id = p_invoice_id;
  end if;
end;
$$;

create function public.payments_recompute_invoice_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_invoice_status(old.invoice_id);
    return old;
  end if;
  perform public.recompute_invoice_status(new.invoice_id);
  return new;
end;
$$;

create trigger payments_after_change
  after insert or update or delete on public.payments
  for each row execute function public.payments_recompute_invoice_status();

-- Recompute a job's invoice_status from the aggregate of its own (non-void)
-- invoice statuses -- never manually set. Priority order picks whichever
-- status needs the most attention first.
create function public.recompute_job_invoice_status(p_job_id uuid)
returns void
language plpgsql
as $$
declare
  v_status text;
begin
  select
    case
      when count(*) filter (where status <> 'Void') = 0 then 'Not Required'
      when bool_or(status = 'Overdue') then 'Overdue'
      when bool_or(status = 'Partially Paid') then 'Partially Paid'
      when bool_and(status = 'Paid') filter (where status <> 'Void') then 'Paid'
      when bool_or(status = 'Paid') then 'Partially Paid'
      when bool_and(status = 'Written Off') filter (where status <> 'Void') then 'Written Off'
      when bool_or(status = 'Sent') then 'Sent'
      else 'Draft'
    end
  into v_status
  from public.invoices
  where job_id = p_job_id;

  update public.jobs set invoice_status = coalesce(v_status, 'Not Required') where id = p_job_id;
end;
$$;

create function public.invoices_recompute_job_invoice_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_job_invoice_status(old.job_id);
    return old;
  end if;
  perform public.recompute_job_invoice_status(new.job_id);
  if tg_op = 'UPDATE' and old.job_id is distinct from new.job_id then
    perform public.recompute_job_invoice_status(old.job_id);
  end if;
  return new;
end;
$$;

create trigger invoices_after_change
  after insert or update or delete on public.invoices
  for each row execute function public.invoices_recompute_job_invoice_status();
