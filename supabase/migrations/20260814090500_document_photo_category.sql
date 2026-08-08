-- Photo-specific categorization, kept separate from the existing `type`
-- column (floor_plan/certificate/test_result/defect_report/other stay as-is
-- — this is an orthogonal classification that only applies when type='photo').
alter table public.documents add column photo_category text
  check (
    photo_category is null
    or photo_category in ('Before', 'After', 'Issue-Defect', 'Switchboard', 'Testing-Compliance', 'General')
  );

alter table public.documents add constraint documents_photo_category_scope
  check (type = 'photo' or photo_category is null);

create index documents_photo_category_idx on public.documents (photo_category) where photo_category is not null;
