-- Align remote schema with src/lib/supabase/schema.sql:
-- 1) Ensure results.mode uses enum quiz_mode ('zen','proctor') instead of text
-- 2) Ensure results.quiz_id has a FK to quizzes.id (with ON DELETE CASCADE)
--
-- This migration is written to be safe to re-run:
-- - Creates enum only if missing
-- - Converts column type only if needed (and only if values are valid)
-- - Adds index and FK only if missing

-- 1) Create enum type if missing
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'quiz_mode' and n.nspname = 'public'
  ) then
    create type public.quiz_mode as enum ('zen', 'proctor');
  end if;
end $$;

-- 2) Convert results.mode from text -> quiz_mode (guard against invalid values)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='results'
      and column_name='mode'
      and udt_name='text'
  ) then
    if exists (
      select 1 from public.results where mode not in ('zen','proctor')
    ) then
      raise exception 'Cannot convert results.mode to quiz_mode: invalid values present';
    end if;

    alter table public.results
      alter column mode type public.quiz_mode
      using mode::public.quiz_mode;
  end if;
end $$;

-- 3) Add an index on results.quiz_id to support FK cascades and common lookups
create index if not exists idx_results_quiz_id on public.results (quiz_id);

-- 4) Add FK results.quiz_id -> quizzes.id (guard against orphaned rows)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.results'::regclass
      and conname = 'results_quiz_id_fkey'
  ) then
    if exists (
      select 1
      from public.results r
      left join public.quizzes q on q.id = r.quiz_id
      where q.id is null
    ) then
      raise exception 'Cannot add FK results.quiz_id -> quizzes.id: orphaned results exist';
    end if;

    alter table public.results
      add constraint results_quiz_id_fkey
      foreign key (quiz_id)
      references public.quizzes(id)
      on delete cascade
      not valid;

    alter table public.results validate constraint results_quiz_id_fkey;
  end if;
end $$;

