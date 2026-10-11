-- HomeBase household recipes, matched against what is in the fridge.
-- Run after 008_shopping_item_import.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that serves recipes.

create table if not exists public.recipes (
  recipe_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  -- One ingredient per entry, as written ("200 g ham")
  ingredients text[] not null default '{}' check (cardinality(ingredients) <= 50),
  steps text check (steps is null or char_length(steps) <= 5000),
  link text check (link is null or (char_length(link) <= 2000 and link ~* '^https?://')),
  is_favourite boolean not null default false,
  last_cooked_on date,
  created_by_member_id uuid,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  deleted_at_utc timestamptz,
  constraint fk_recipes_creator_same_household
    foreign key (household_id, created_by_member_id)
    references public.household_members(household_id, household_member_id)
);

create index if not exists ix_recipes_household
  on public.recipes (household_id)
  where deleted_at_utc is null;

-- RLS on with no policies, like the other tables: only the API's server key can read and write
alter table public.recipes enable row level security;
