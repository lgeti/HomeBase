-- HomeBase shared shopping lists.
-- Run after 003_recurring_occurrences.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that serves shopping lists.

-- A household's lists: one per store or purpose (Groceries, Temu, Marketplace, IKEA...)
create table if not exists public.shopping_lists (
  list_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  created_by_member_id uuid,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  deleted_at_utc timestamptz,
  constraint uq_shopping_lists_household_list unique (household_id, list_id),
  constraint fk_shopping_lists_creator_same_household
    foreign key (household_id, created_by_member_id)
    references public.household_members(household_id, household_member_id)
);

-- List names are unique within a household, ignoring case; deleted lists free their name
create unique index if not exists ux_shopping_lists_household_name
  on public.shopping_lists (household_id, lower(trim(name)))
  where deleted_at_utc is null;

-- Items to buy, or things being sold (Marketplace, Vinted)
create table if not exists public.shopping_items (
  item_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  list_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  kind text not null default 'buy' check (kind in ('buy', 'sell')),
  -- Buying: open -> bought. Selling: listed -> sold.
  status text not null default 'open',
  quantity text check (quantity is null or char_length(quantity) <= 30),
  price numeric(19, 4) check (price is null or price >= 0),
  link text check (link is null or (char_length(link) <= 2000 and link ~* '^https?://')),
  note text check (note is null or char_length(note) <= 500),
  added_by_member_id uuid,
  done_by_member_id uuid,
  done_at_utc timestamptz,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  deleted_at_utc timestamptz,
  constraint fk_shopping_items_list_same_household
    foreign key (household_id, list_id)
    references public.shopping_lists(household_id, list_id) on delete cascade,
  constraint fk_shopping_items_adder_same_household
    foreign key (household_id, added_by_member_id)
    references public.household_members(household_id, household_member_id),
  constraint fk_shopping_items_doer_same_household
    foreign key (household_id, done_by_member_id)
    references public.household_members(household_id, household_member_id),
  constraint ck_shopping_items_status check (
    (kind = 'buy' and status in ('open', 'bought'))
    or (kind = 'sell' and status in ('listed', 'sold'))
  )
);

create index if not exists ix_shopping_items_household_list
  on public.shopping_items (household_id, list_id)
  where deleted_at_utc is null;

-- RLS on with no policies, like the other tables: only the API's server key can read and write
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
