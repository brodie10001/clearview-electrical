-- Sequential, never-reused quote numbers (QUO-0001, QUO-0002, ...). A real
-- Postgres sequence guarantees atomic, gap-tolerant assignment even under
-- concurrent inserts -- never a manually-incremented column.
create sequence public.quotes_number_seq;

alter table public.quotes add column quote_number text;

-- Backfill existing quotes in creation order.
with numbered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.quotes
)
update public.quotes q
set quote_number = 'QUO-' || lpad(numbered.rn::text, 4, '0')
from numbered
where q.id = numbered.id;

select setval('public.quotes_number_seq', (select count(*) from public.quotes), true);

alter table public.quotes
  alter column quote_number set default ('QUO-' || lpad(nextval('public.quotes_number_seq')::text, 4, '0'));
alter table public.quotes alter column quote_number set not null;

create unique index quotes_quote_number_idx on public.quotes (quote_number);
