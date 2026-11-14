-- Doorbooks — Supabase schema (Phase 2). Mirrors app/doorbooks/_lib/types.ts.
-- Money is integer cents. Dates are DATE (local calendar day, no timezone games).

create extension if not exists "pgcrypto";

create type property_type as enum ('single', 'multi', 'condo', 'commercial', 'land', 'other');
create type tx_kind as enum ('income', 'expense');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null default 'My Rentals',
  accounts text[] not null default array['Checking', 'Credit card', 'Cash'],
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  name text not null,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  type property_type not null default 'single',
  color text not null default '#f0b429',
  purchase_price bigint,
  purchase_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  label text not null,
  rent bigint not null default 0,
  tenant text not null default '',
  lease_start date,
  lease_end date,
  sort int not null default 0
);

-- Chart of accounts is code (categories.ts); category_id is the string id, validated in the app.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  date date not null,
  kind tx_kind not null,
  category_id text not null,
  amount bigint not null check (amount > 0),
  payee text not null default '',
  memo text not null default '',
  account text not null default '',
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.properties (book_id);
create index on public.units (property_id);
create index on public.transactions (book_id, date desc);
create index on public.transactions (property_id, date desc);

-- Row level security: a user sees only their own books.
alter table public.books enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.transactions enable row level security;

create policy "own books" on public.books for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own properties" on public.properties for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

create policy "own units" on public.units for all
  using (exists (select 1 from public.properties p join public.books b on b.id = p.book_id where p.id = property_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p join public.books b on b.id = p.book_id where p.id = property_id and b.owner_id = auth.uid()));

create policy "own transactions" on public.transactions for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

-- Remember: grant select on <tables> to anon, authenticated; after running in the SQL editor.
grant select, insert, update, delete on public.books, public.properties, public.units, public.transactions to authenticated;

-- P&L by property, straight from SQL (handy for the CPA share link later).
create or replace view public.pl_by_property as
select t.book_id, t.property_id, date_trunc('month', t.date)::date as month, t.kind, t.category_id, sum(t.amount) as amount
from public.transactions t
group by 1, 2, 3, 4, 5;
