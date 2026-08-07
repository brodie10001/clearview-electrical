-- One private scratchpad per user, backing the Dashboard's Personal Notes
-- widget. Not shared between team members.
create table public.personal_notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create trigger personal_notes_set_updated_at
  before update on public.personal_notes
  for each row execute function public.set_updated_at();

alter table public.personal_notes enable row level security;

create policy "users can manage their own notes"
  on public.personal_notes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
