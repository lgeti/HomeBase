-- HomeBase initial PostgreSQL schema for Supabase.
-- Run this file in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.households (
  household_id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create table if not exists public.household_members (
  household_member_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 100),
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  constraint uq_household_members_household_name unique (household_id, display_name),
  constraint uq_household_members_household_member unique (household_id, household_member_id)
);

create table if not exists public.categories (
  category_id text primary key,
  name text not null,
  description text,
  sort_order integer not null,
  is_active boolean not null default true
);

create table if not exists public.expenses (
  expense_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  category_id text not null references public.categories(category_id),
  amount numeric(19, 4) not null check (amount > 0),
  tag text,
  description text,
  expense_date date not null,
  paid_by_member_id uuid not null,
  split_type text not null check (split_type in ('one', 'split')),
  is_recurring boolean not null default false,
  recurring_frequency text,
  next_due_date date,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  deleted_at_utc timestamptz,
  constraint fk_expenses_payer_same_household
    foreign key (household_id, paid_by_member_id)
    references public.household_members(household_id, household_member_id),
  constraint ck_expenses_recurring_fields check (
    (is_recurring = false and recurring_frequency is null and next_due_date is null)
    or (
      is_recurring = true
      and recurring_frequency in ('weekly', 'monthly', 'yearly')
      and next_due_date is not null
    )
  )
);

create index if not exists ix_expenses_household_date
  on public.expenses (household_id, expense_date desc)
  where deleted_at_utc is null;

create index if not exists ix_expenses_household_category_date
  on public.expenses (household_id, category_id, expense_date desc)
  where deleted_at_utc is null;

create index if not exists ix_expenses_recurring_due_date
  on public.expenses (household_id, next_due_date)
  where is_recurring = true and deleted_at_utc is null;

create index if not exists ix_household_members_household
  on public.household_members (household_id);

insert into public.categories (category_id, name, description, sort_order)
values
  ('car', 'Car', 'Fuel, insurance, maintenance, parking, toll, tax', 1),
  ('subscriptions', 'Subscriptions', 'Netflix, Spotify, gym, apps, recurring services', 2),
  ('groceries', 'Groceries', 'Supermarket runs, market, delivery', 3),
  ('entertainment', 'Entertainment', 'Cinema, concerts, games, hobbies', 4),
  ('going-out', 'Going Out', 'Restaurants, bars, cafes, takeaway', 5),
  ('utilities', 'Rent & Utilities', 'Rent, electricity, gas, water, internet, phone', 6),
  ('home', 'Home', 'Furniture, repairs, cleaning supplies, appliances', 7),
  ('other', 'Other', 'Anything that does not fit', 8)
on conflict (category_id) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

-- RLS blocks public client access by default. The backend service-role key
-- bypasses RLS; add user-scoped policies when authentication is implemented.
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
