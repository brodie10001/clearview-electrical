-- Every RLS-scoped table already has a single-column business_id index, but
-- the hottest queries filter business_id (via RLS) *and* archived/status,
-- then order by a date column -- Postgres can only use one index for that
-- and sorts/filters the rest in memory. These composite indexes cover the
-- actual filter+sort shape of the highest-traffic queries.

-- Jobs list (src/app/(app)/jobs/page.tsx): .eq("archived", ...).order("created_at" desc)
create index jobs_business_archived_created_idx
  on public.jobs (business_id, archived, created_at desc);

-- Dashboard "recently updated"/"stalled" jobs (src/app/(app)/page.tsx):
-- .eq("archived", false).order("updated_at")
create index jobs_business_archived_updated_idx
  on public.jobs (business_id, archived, updated_at);

-- Invoices list (src/app/(app)/finances/invoices/page.tsx):
-- optional .eq("status", ...).order("due_date" desc)
create index invoices_business_status_idx
  on public.invoices (business_id, status);

create index invoices_business_due_date_idx
  on public.invoices (business_id, due_date desc);

-- Dashboard accepted-quotes widget + finances/quotes list:
-- .eq("status", "Accepted").order("updated_at" desc)
create index quotes_business_status_updated_idx
  on public.quotes (business_id, status, updated_at desc);

-- Dashboard recent-documents feed: ordered by created_at, no other filter
create index documents_business_created_idx
  on public.documents (business_id, created_at desc);
