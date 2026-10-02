-- HomeBase v3 household membership migration.
-- Run after 001_initial_schema.sql in the Supabase SQL Editor.

alter table public.households
  add column if not exists owner_user_id uuid;

alter table public.household_members
  add column if not exists auth_user_id uuid,
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'active',
  add column if not exists invited_email text,
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_household_members_auth_user'
  ) then
    alter table public.household_members
      add constraint fk_household_members_auth_user
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ck_household_members_role'
  ) then
    alter table public.household_members
      add constraint ck_household_members_role
      check (role in ('owner', 'admin', 'member'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ck_household_members_status'
  ) then
    alter table public.household_members
      add constraint ck_household_members_status
      check (status in ('pending', 'active', 'removed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_households_owner_user'
  ) then
    alter table public.households
      add constraint fk_households_owner_user
      foreign key (owner_user_id) references auth.users(id) on delete restrict;
  end if;
end $$;

create index if not exists ix_households_owner_user
  on public.households (owner_user_id);

create unique index if not exists ux_household_members_active_auth_user
  on public.household_members (household_id, auth_user_id)
  where auth_user_id is not null and status <> 'removed';

create table if not exists public.household_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(household_id) on delete cascade,
  invited_email text,
  invited_role text not null default 'member'
    check (invited_role in ('admin', 'member')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at_utc timestamptz not null default now()
);

create index if not exists ix_household_invitations_household
  on public.household_invitations (household_id);

alter table public.household_invitations enable row level security;
