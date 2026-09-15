-- Migration 011: Fix stat_entries CHECK constraint to match live code and data.
-- Original 008 allowed only PTS/REB/AST/STL/BLK/TO/2M/3M/FT.
-- Live data contains 2M,2X,3M,3X,FTM,DREB,STL,PTS — constraint was never enforced
-- or was silently dropped. Replace with full current + legacy set.

begin;

-- Drop any existing stat_type check constraints (name varies by PG version)
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select constraint_name
      from information_schema.table_constraints
     where table_schema = 'public'
       and table_name = 'stat_entries'
       and constraint_type = 'CHECK'
  loop
    -- Only drop stat_type constraints, not others
    if v_constraint like '%stat_type%' then
      execute format('alter table public.stat_entries drop constraint if exists %I', v_constraint);
      raise notice 'Dropped: %', v_constraint;
    end if;
  end loop;
end $$;

alter table public.stat_entries
  drop constraint if exists stat_entries_stat_type_check;

-- Full set: current code types + legacy types from migration 008
alter table public.stat_entries
  add constraint stat_entries_stat_type_check check (
    stat_type in (
      -- Current types (code + live data)
      '2M', '2X', '3M', '3X',
      'FTM', 'FTX',
      'OREB', 'DREB',
      'AST', 'STL', 'BLK', 'DEF',
      'TO', 'FOUL',
      -- Legacy types from original migration 008 (preserve any existing rows)
      'PTS', 'REB', 'FT'
    )
  );

commit;
