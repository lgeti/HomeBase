-- HomeBase household inventory: what the household owns beyond the fridge.
-- Run after 009_recipes.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that serves the inventory.

-- Groups like Appliances, Bathroom and Cleaning; households can add their own
create table if not exists public.inventory_groups (
  group_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  sort_order integer not null default 0,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  deleted_at_utc timestamptz,
  constraint uq_inventory_groups_household_group unique (household_id, group_id)
);

-- Group names are unique within a household, ignoring case; deleted groups free their name
create unique index if not exists ux_inventory_groups_household_name
  on public.inventory_groups (household_id, lower(trim(name)))
  where deleted_at_utc is null;

create table if not exists public.inventory_items (
  item_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  group_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  quantity text check (quantity is null or char_length(quantity) <= 30),
  note text check (note is null or char_length(note) <= 500),
  -- For things bought once (appliances): when, for how much, and until when the warranty runs
  purchased_on date,
  price numeric(19, 4) check (price is null or price >= 0),
  warranty_until date,
  -- For supplies: set when someone marks it running low, cleared when restocked
  is_running_low boolean not null default false,
  added_by_member_id uuid,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  deleted_at_utc timestamptz,
  constraint fk_inventory_items_group_same_household
    foreign key (household_id, group_id)
    references public.inventory_groups(household_id, group_id) on delete cascade,
  constraint fk_inventory_items_adder_same_household
    foreign key (household_id, added_by_member_id)
    references public.household_members(household_id, household_member_id)
);

create index if not exists ix_inventory_items_household_group
  on public.inventory_items (household_id, group_id)
  where deleted_at_utc is null;

-- RLS on with no policies, like the other tables: only the API's server key can read and write
alter table public.inventory_groups enable row level security;
alter table public.inventory_items enable row level security;
