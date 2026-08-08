-- Forms engine for compliance paperwork (certificates, notices, etc). Kept
-- generic on purpose: category is open text and each template defines its
-- own field_schema, rather than hardcoding today's WA electrical document
-- types into the schema. See CLAUDE.md -- this is a trade module, not core.
--
-- external_reference on compliance_documents is a plain manual text field
-- for noting a WA eNotice reference once lodged there directly -- this is
-- NOT an eNotice integration and never will be.
create table public.compliance_document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  -- Array of { key, label, type, required, options? }. type is one of
  -- 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select'.
  field_schema jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger compliance_document_templates_set_updated_at
  before update on public.compliance_document_templates
  for each row execute function public.set_updated_at();

create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  -- Deliberately RESTRICT (not the app's usual cascade): a compliance
  -- document is a durable record and must never be capable of silently
  -- disappearing because a job or property row was deleted.
  job_id uuid not null references public.jobs (id) on delete restrict,
  -- property_id is stored independently of job_id so the document stays
  -- linked to the property permanently even if the job record later
  -- changes (e.g. gets archived/reassigned).
  property_id uuid not null references public.properties (id) on delete restrict,
  template_id uuid not null references public.compliance_document_templates (id) on delete restrict,
  field_values jsonb not null default '{}'::jsonb,
  status text not null default 'Draft' check (status in ('Draft', 'Issued', 'Lodged')),
  external_reference text,
  issued_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_documents_job_id_idx on public.compliance_documents (job_id);
create index compliance_documents_property_id_idx on public.compliance_documents (property_id);
create index compliance_documents_template_id_idx on public.compliance_documents (template_id);

create trigger compliance_documents_set_updated_at
  before update on public.compliance_documents
  for each row execute function public.set_updated_at();

alter table public.compliance_document_templates enable row level security;
alter table public.compliance_documents enable row level security;

create policy "active users can view compliance document templates"
  on public.compliance_document_templates for select
  to authenticated
  using (public.is_active_user());

create policy "admins can manage compliance document templates"
  on public.compliance_document_templates for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "active users can manage compliance documents"
  on public.compliance_documents for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- Starter templates only -- exact fields get refined once he's licensed in
-- September. Adjustable any time from Business Settings > Testing &
-- Compliance.
insert into public.compliance_document_templates (name, category, field_schema) values
(
  'Electrical Safety Certificate',
  'Electrical Safety Certificate',
  '[
    {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
    {"key": "installation_type", "label": "Installation type", "type": "select", "required": true, "options": ["New Installation", "Alteration", "Repair", "Testing Only"]},
    {"key": "compliant", "label": "Installation complies with AS/NZS 3000", "type": "checkbox", "required": true},
    {"key": "defects_noted", "label": "Defects noted", "type": "textarea", "required": false},
    {"key": "electrician_license_number", "label": "Electrician licence number", "type": "text", "required": true},
    {"key": "date_of_inspection", "label": "Date of inspection", "type": "date", "required": true}
  ]'::jsonb
),
(
  'Notice of Completion',
  'Notice of Completion',
  '[
    {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
    {"key": "date_completed", "label": "Date completed", "type": "date", "required": true},
    {"key": "contractor_license_number", "label": "Contractor licence number", "type": "text", "required": true},
    {"key": "notes", "label": "Notes", "type": "textarea", "required": false}
  ]'::jsonb
),
(
  'Preliminary Notice',
  'Preliminary Notice',
  '[
    {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
    {"key": "estimated_start_date", "label": "Estimated start date", "type": "date", "required": true},
    {"key": "estimated_completion_date", "label": "Estimated completion date", "type": "date", "required": false},
    {"key": "notes", "label": "Notes", "type": "textarea", "required": false}
  ]'::jsonb
);
