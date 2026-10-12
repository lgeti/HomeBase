-- HomeBase pantry: food items live in the fridge or the pantry.
-- Run after 011_realtime_household_channels.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that knows about the pantry.

-- The table keeps its name (fridge_items) and now holds all food at home; existing items stay in the fridge
alter table public.fridge_items
  add column if not exists location text not null default 'fridge'
    check (location in ('fridge', 'pantry'));
