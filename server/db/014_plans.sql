-- HomeBase plans: every household is on free or pro, and AI use is counted per household.
-- Run after 013_link_invitations.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version with plans and limits.
-- The limits themselves live in server/src/plans.js, not in the database.

alter table public.households
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro')),
  -- Filled in by Stripe billing later; empty for free households and for pro granted by hand
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_status text,
  add column if not exists current_period_end timestamptz;

-- One row per counted use, e.g. one AI call; a month's usage is a count of rows
create table if not exists public.usage_events (
  usage_event_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  created_at timestamptz not null default now()
);

create index if not exists ix_usage_events_household_kind_created
  on public.usage_events (household_id, kind, created_at);

-- RLS on with no policies, like the other tables: only the API's server key can read and write
alter table public.usage_events enable row level security;
