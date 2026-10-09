-- HomeBase recurring expense generation.
-- Run after 002_multi_member_households.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that generates recurring expenses.

-- Each generated expense points at the recurring expense it came from
alter table public.expenses
  add column if not exists recurring_source_id uuid references public.expenses(expense_id);

-- A recurring expense can produce at most one expense per date, so generation can never duplicate.
-- Ordinary expenses have recurring_source_id = null and are not affected (nulls are never equal).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_expenses_recurring_occurrence'
  ) then
    alter table public.expenses
      add constraint uq_expenses_recurring_occurrence unique (recurring_source_id, expense_date);
  end if;
end $$;
