-- Shared helper: keeps an `updated_at` column current on every row update.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
