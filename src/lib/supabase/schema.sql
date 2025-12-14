-- Enable Row Level Security
alter default privileges revoke execute on functions from public;

create type quiz_mode as enum ('zen', 'proctor');

-- TABLE: profiles
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default '',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table profiles enable row level security;

create policy "Users can view their own profile."
  on profiles for select
  using ( (SELECT auth.uid()) = id );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( (SELECT auth.uid()) = id );

create policy "Users can update their own profile."
  on profiles for update
  using ( (SELECT auth.uid()) = id );

create policy "Users can delete their own profile."
  on profiles for delete
  using ( (SELECT auth.uid()) = id );

-- TABLE: quizzes
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  version integer not null default 1,
  questions jsonb not null,
  quiz_hash text,
  source_id text,  -- Optional: Reference to source quiz for imports
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

alter table quizzes enable row level security;

create policy "Users can view their own quizzes."
  on quizzes for select
  using ( (SELECT auth.uid()) = user_id );

create policy "Users can insert their own quizzes."
  on quizzes for insert
  with check ( (SELECT auth.uid()) = user_id );

create policy "Users can update their own quizzes."
  on quizzes for update
  using ( (SELECT auth.uid()) = user_id );

create policy "Users can delete their own quizzes."
  on quizzes for delete
  using ( (SELECT auth.uid()) = user_id );

-- TABLE: results
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  timestamp bigint not null, -- Storing Unix timestamp to match local Dexie format
  mode quiz_mode not null,
  score integer not null,
  time_taken_seconds integer not null,
  answers jsonb not null default '{}'::jsonb,
  flagged_questions jsonb not null default '[]'::jsonb,
  category_breakdown jsonb not null default '{}'::jsonb,
  question_ids jsonb default null, -- Optional: Subset of questions for Smart Round / Review Missed
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone default null -- Soft-delete for cross-device sync
);

alter table results enable row level security;

create policy "Users can view own results"
  on results for select
  using ( (SELECT auth.uid()) = user_id );

create policy "Users can insert own results"
  on results for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.quizzes q
      where q.id = results.quiz_id
        and q.user_id = (select auth.uid())
    )
  );

-- Results are immutable historical records, EXCEPT for sync idempotency (upserts)
create policy "Users can update own results"
  on results for update
  using ( (SELECT auth.uid()) = user_id )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.quizzes q
      where q.id = results.quiz_id
        and q.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own results"
  on results for delete
  using ( (SELECT auth.uid()) = user_id );

-- Trigger to automatically create a profile when a new user signs up
-- (This is a common Supabase pattern)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id, 
    CASE 
      WHEN new.raw_user_meta_data ->> 'full_name' IS NOT NULL AND new.raw_user_meta_data ->> 'full_name' <> '' 
      THEN new.raw_user_meta_data ->> 'full_name'
      ELSE COALESCE(new.email, '')
    END
  );
  return new;
end;
$$;

-- Drop the trigger if it exists to avoid duplication errors on re-runs
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- OPTIMIZATION: Index for incremental sync
-- Supports the query: .eq('user_id', userId).or('updated_at.gt...,and(...)').order('updated_at', ...).order('id', ...)
create index concurrently if not exists idx_results_sync_updated_at
  on results (user_id, updated_at, id);

-- OPTIMIZATION: Index for quiz sync (keyset pagination by user + updated_at + id)
create index concurrently if not exists idx_quizzes_sync_optimization
  on quizzes (user_id, updated_at, id);

-- Trigger to keep updated_at fresh on updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists quizzes_set_updated_at on quizzes;
create trigger quizzes_set_updated_at
  before update on quizzes
  for each row execute procedure public.set_updated_at();

drop trigger if exists results_set_updated_at on results;
create trigger results_set_updated_at
  before update on results
  for each row execute procedure public.set_updated_at();

-- PROTECTION: LWW guard for deleted records
-- See migration: 20251214_results_lww_protection.sql
-- Prevents stale clients from resurrecting remotely deleted results

-- TABLE: srs (Spaced Repetition State)
create table if not exists srs (
  question_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  box smallint not null default 1 check (box >= 1 and box <= 5),
  last_reviewed bigint not null,  -- Unix timestamp (ms) for LWW conflict resolution
  next_review bigint not null,    -- Unix timestamp (ms)
  consecutive_correct integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Composite primary key (one SRS state per question per user)
  primary key (question_id, user_id)
);

alter table srs enable row level security;

-- RLS: Users can only access their own SRS data
create policy "Users can view own SRS state"
  on srs for select
  using ( (SELECT auth.uid()) = user_id );

create policy "Users can insert own SRS state"
  on srs for insert
  with check ( (SELECT auth.uid()) = user_id );

create policy "Users can update own SRS state"
  on srs for update
  using ( (SELECT auth.uid()) = user_id );

create policy "Users can delete own SRS state"
  on srs for delete
  using ( (SELECT auth.uid()) = user_id );

-- OPTIMIZATION: Index for incremental sync (keyset pagination)
create index concurrently if not exists idx_srs_sync_optimization
  on srs (user_id, updated_at, question_id);

-- OPTIMIZATION: Index for querying due SRS questions
create index concurrently if not exists idx_srs_next_review
  on srs (user_id, next_review);

-- Trigger to auto-update updated_at on changes
drop trigger if exists srs_set_updated_at on srs;
create trigger srs_set_updated_at
  before update on srs
  for each row execute procedure public.set_updated_at();