-- Enable Row Level Security
alter default privileges revoke execute on functions from public;

-- TABLE: profiles
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table profiles enable row level security;

create policy "Users can view their own profile."
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on profiles for update
  using ( auth.uid() = id );

-- TABLE: results
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quiz_id text not null,
  timestamp bigint not null, -- Storing Unix timestamp to match local Dexie format
  mode text not null check (mode in ('zen', 'proctor')),
  score integer not null,
  time_taken_seconds integer not null,
  answers jsonb not null default '{}'::jsonb,
  flagged_questions jsonb not null default '[]'::jsonb,
  category_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table results enable row level security;

create policy "Users can view their own results."
  on results for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own results."
  on results for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own results."
  on results for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own results."
  on results for delete
  using ( auth.uid() = user_id );

-- Trigger to automatically create a profile when a new user signs up
-- (This is a common Supabase pattern)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- Drop the trigger if it exists to avoid duplication errors on re-runs
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
