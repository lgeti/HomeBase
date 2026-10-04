-- HomeBase development reset script.
-- WARNING: This permanently deletes all household application data.
-- It preserves the database schema, categories, and Supabase Auth users.
-- Run only in a development/test Supabase project.

begin;

-- CASCADE also removes related household invitations when that table exists.
truncate table
  public.expenses,
  public.household_members,
  public.households
restart identity cascade;

commit;

-- This script does not delete users from Supabase Auth (auth.users).
-- Delete Auth users separately from Supabase Dashboard > Authentication > Users.
