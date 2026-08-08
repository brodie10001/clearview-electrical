-- Minimal change-order support: a variation adjusts a job's contract value
-- once Approved. Draft/Rejected variations never count toward billing math.
create table public.job_variations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  description text not null,
  amount numeric not null,
  status text not null default 'Draft' check (status in ('Draft', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

create index job_variations_job_id_idx on public.job_variations (job_id);

alter table public.job_variations enable row level security;

create policy "active users can manage job variations"
  on public.job_variations for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
