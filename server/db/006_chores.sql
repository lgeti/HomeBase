-- HomeBase shared chores.
-- Run after 005_fridge_items.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that serves chores.

create table if not exists public.chores (
  chore_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  note text check (note is null or char_length(note) <= 500),
  -- null means anyone can do it
  assignee_member_id uuid,
  frequency text not null check (frequency in ('once', 'daily', 'weekly', 'monthly')),
  -- The schedule counts from starts_on, so monthly chores on the 31st stay at month end
  starts_on date not null,
  due_on date not null,
  created_by_member_id uuid,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  -- A one-time chore is finished once it is done; finished and deleted chores are hidden
  completed_at_utc timestamptz,
  deleted_at_utc timestamptz,
  constraint uq_chores_household_chore unique (household_id, chore_id),
  constraint fk_chores_assignee_same_household
    foreign key (household_id, assignee_member_id)
    references public.household_members(household_id, household_member_id),
  constraint fk_chores_creator_same_household
    foreign key (household_id, created_by_member_id)
    references public.household_members(household_id, household_member_id)
);

create index if not exists ix_chores_household_due
  on public.chores (household_id, due_on)
  where deleted_at_utc is null and completed_at_utc is null;

-- Every time a chore was done: who, on which day, and which due date it covered (so it can be undone)
create table if not exists public.chore_completions (
  completion_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  chore_id uuid not null,
  done_by_member_id uuid not null,
  done_on date not null,
  covered_due_on date not null,
  created_at_utc timestamptz not null default now(),
  constraint fk_chore_completions_chore_same_household
    foreign key (household_id, chore_id)
    references public.chores(household_id, chore_id) on delete cascade,
  constraint fk_chore_completions_doer_same_household
    foreign key (household_id, done_by_member_id)
    references public.household_members(household_id, household_member_id)
);

create index if not exists ix_chore_completions_chore
  on public.chore_completions (chore_id, created_at_utc desc);

-- RLS on with no policies, like the other tables: only the API's server key can read and write
alter table public.chores enable row level security;
alter table public.chore_completions enable row level security;
