-- Enable Row Level Security (if not already enabled, though schema says it is)
alter table public.results enable row level security;

-- Drop existing policies to ensure clean recreation
drop policy if exists "Users can view own results" on public.results;
drop policy if exists "Users can insert own results" on public.results;
drop policy if exists "Users can update own results" on public.results;
drop policy if exists "Users can delete own results" on public.results;

-- Recreate SELECT/DELETE policies (unchanged logic)
create policy "Users can view own results"
  on public.results for select
  using ((select auth.uid()) = user_id);

create policy "Users can delete own results"
  on public.results for delete
  using ((select auth.uid()) = user_id);

-- Recreate INSERT policy with quiz ownership check
create policy "Users can insert own results"
  on public.results for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.quizzes q
      where q.id = results.quiz_id
        and q.user_id = (select auth.uid())
    )
  );

-- Recreate UPDATE policy with quiz ownership check
create policy "Users can update own results"
  on public.results for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.quizzes q
      where q.id = results.quiz_id
        and q.user_id = (select auth.uid())
    )
  );
