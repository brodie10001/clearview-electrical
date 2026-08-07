create table public.documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  type text not null check (
    type in ('photo', 'floor_plan', 'certificate', 'test_result', 'defect_report', 'other')
  ),
  file_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index documents_property_id_idx on public.documents (property_id);
create index documents_job_id_idx on public.documents (job_id);
create index documents_type_idx on public.documents (type);

alter table public.documents enable row level security;

create policy "active users can manage documents"
  on public.documents for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
