-- Team invites: lets an owner/admin add a colleague to their own business
-- instead of every new auth.users row always spinning up a brand-new one.
-- handle_new_user() only ever branched on business_name in metadata (see
-- 20260814092000_multi_tenancy.sql's comment: "this app has no invite a
-- colleague flow yet"); this is that follow-up.
--
-- The app invites via supabase.auth.admin.inviteUserByEmail(email, { data:
-- { invited_business_id, invited_role, full_name } }) -- when that metadata
-- is present, the trigger joins the invited user onto that existing
-- business under that role instead of creating a new one.
alter table public.profiles
  add column accepted_at timestamptz;

-- Backfill: every profile that already exists came from self-signup (there
-- was no invite path before now), so it's already "accepted" -- there's no
-- retroactive pending state to represent.
update public.profiles set accepted_at = created_at where accepted_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  business_name text;
  invited_business_id uuid;
  invited_role text;
begin
  invited_business_id := nullif(new.raw_user_meta_data ->> 'invited_business_id', '')::uuid;

  if invited_business_id is not null then
    invited_role := coalesce(new.raw_user_meta_data ->> 'invited_role', 'technician');

    insert into public.profiles (id, email, full_name, business_id, role, accepted_at)
    values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', invited_business_id, invited_role, null)
    on conflict (id) do nothing;

    return new;
  end if;

  business_name := new.raw_user_meta_data ->> 'business_name';

  if business_name is null or trim(business_name) = '' then
    raise exception 'signup requires a business_name in user metadata';
  end if;

  insert into public.businesses (name) values (trim(business_name))
    returning id into new_business_id;

  perform public.seed_new_business(new_business_id);

  insert into public.profiles (id, email, full_name, business_id, role, accepted_at)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new_business_id, 'owner', now())
  on conflict (id) do nothing;

  return new;
end;
$$;

-- An invited profile starts with accepted_at = null ("Pending" in the Team
-- UI). Supabase leaves email_confirmed_at null until the invited user
-- actually opens the link and sets a password -- that transition is the
-- signal to flip accepted_at, so the Team list reflects reality without the
-- app having to poll or guess.
create function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles set accepted_at = now() where id = new.id and accepted_at is null;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update on auth.users
  for each row execute function public.handle_user_confirmed();
