-- Redesign Personal Notes from one freeform text blob per user into a
-- checklist (many rows per user). Existing freeform content is preserved as
-- a single unchecked item rather than discarded.
create table public.personal_note_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  is_checked boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index personal_note_items_user_id_idx on public.personal_note_items (user_id);

alter table public.personal_note_items enable row level security;

create policy "users can manage their own note items"
  on public.personal_note_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into public.personal_note_items (user_id, text, position)
select user_id, content, 0
from public.personal_notes
where trim(content) <> '';

drop table public.personal_notes;
