create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  status text not null default 'Draft'
    check (status in ('Draft', 'Sent', 'Accepted', 'Rejected')),
  expiry_date date,
  notes text,
  -- Denormalized totals, recalculated by the app whenever line items change
  -- (see recalculateQuoteTotals). Avoids re-summing line items on every list
  -- render, and gst_applied snapshots the business's GST-registered status
  -- so a quote's historical figures don't silently change if that setting
  -- is flipped later.
  subtotal numeric not null default 0,
  gst_amount numeric not null default 0,
  total numeric not null default 0,
  gst_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_job_id_idx on public.quotes (job_id);
create index quotes_status_idx on public.quotes (status);

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;

create policy "active users can manage quotes"
  on public.quotes for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  line_type text not null check (line_type in ('labour', 'material')),
  sort_order integer not null default 0,
  description text,
  -- Labour lines: rate type reference + a snapshot of that type's $/hour at
  -- the time the line was added (editable per line), plus hours worked.
  labour_rate_type_id uuid references public.labour_rate_types (id) on delete set null,
  rate_per_hour numeric,
  hours numeric,
  -- Material lines: cost and markup % (pre-filled from the business default,
  -- editable per line).
  cost numeric,
  markup_percent numeric,
  line_total numeric not null default 0,
  created_at timestamptz not null default now(),
  check (
    (line_type = 'labour' and hours is not null and rate_per_hour is not null)
    or
    (line_type = 'material' and cost is not null)
  )
);

create index quote_line_items_quote_id_idx on public.quote_line_items (quote_id);

alter table public.quote_line_items enable row level security;

create policy "active users can manage quote line items"
  on public.quote_line_items for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
