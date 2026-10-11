-- HomeBase chores: choose how the next date is set.
-- Run after 006_chores.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that reads fixed_schedule.

-- false (default): the next date counts from the day the chore was done.
-- true: the chore stays on its day (e.g. bin day), done early or late.
alter table public.chores
  add column if not exists fixed_schedule boolean not null default false;
