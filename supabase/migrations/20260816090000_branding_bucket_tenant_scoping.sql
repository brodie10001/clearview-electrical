-- The `branding` bucket's write policies (insert/update/delete) only ever
-- checked is_admin_user() -- any business's admin could overwrite or
-- delete ANY other business's logo object, provided they knew its exact
-- storage path. That path isn't actually secret: it's embedded directly in
-- the owning business's own public quote/invoice pages (<img src>), so
-- it's discoverable, not just guessable. Confirmed exploitable in a local
-- RLS re-verification pass before beta.
--
-- Fixed using Supabase's standard folder-based storage isolation pattern:
-- uploads must now live under a `<business_id>/...` path prefix within the
-- bucket, and the write policies check that prefix against the caller's
-- own business via storage.foldername(). Public read stays intentionally
-- bucket-wide and unscoped -- logos were never confidential (they're
-- already shown on public pages), only the write side needed narrowing.
--
-- Pre-existing objects uploaded before this migration (flat filenames, no
-- business_id prefix) have no folder segment to match, so an admin can no
-- longer update/delete that specific old object in place -- they can still
-- upload a fresh logo under the new scheme, which just leaves the old
-- object orphaned (still publicly readable, referenced by nothing).

alter policy "admins can upload branding assets" on storage.objects
  with check (
    bucket_id = 'branding'
    and public.is_admin_user()
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

alter policy "admins can update branding assets" on storage.objects
  using (
    bucket_id = 'branding'
    and public.is_admin_user()
    and (storage.foldername(name))[1] = public.current_business_id()::text
  )
  with check (
    bucket_id = 'branding'
    and public.is_admin_user()
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

alter policy "admins can delete branding assets" on storage.objects
  using (
    bucket_id = 'branding'
    and public.is_admin_user()
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );
