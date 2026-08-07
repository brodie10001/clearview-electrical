-- Private bucket backing the `documents` table's file_url. Files are served
-- via signed URLs from the app, never made public.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "active users can read document files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents' and public.is_active_user());

create policy "active users can upload document files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and public.is_active_user());

create policy "active users can update document files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents' and public.is_active_user())
  with check (bucket_id = 'documents' and public.is_active_user());

create policy "active users can delete document files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and public.is_active_user());
