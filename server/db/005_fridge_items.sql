-- HomeBase shared fridge inventory.
-- Run after 004_shopping_lists.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that serves the fridge.

create table if not exists public.fridge_items (
  item_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  quantity text check (quantity is null or char_length(quantity) <= 30),
  expires_on date,
  note text check (note is null or char_length(note) <= 500),
  added_by_member_id uuid,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  -- Removed items stay but are hidden; used_up tells "used up" apart from "deleted by mistake"
  deleted_at_utc timestamptz,
  used_up boolean not null default false,
  constraint fk_fridge_items_adder_same_household
    foreign key (household_id, added_by_member_id)
    references public.household_members(household_id, household_member_id)
);

create index if not exists ix_fridge_items_household
  on public.fridge_items (household_id, expires_on)
  where deleted_at_utc is null;

-- RLS on with no policies, like the other tables: only the API's server key can read and write
alter table public.fridge_items enable row level security;
