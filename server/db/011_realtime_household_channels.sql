-- HomeBase live updates: who may listen on a household's private Realtime channel.
-- Run after 010_inventory.sql in the Supabase SQL Editor.
--
-- The API (with the secret key) sends a short "this section changed" message on the channel
-- "household:<household id>" after every change; the app then reloads that section through the API.
-- No application data goes through Realtime, and browsers still cannot read any app table.

-- True when the signed-in user is a joined member of the household. Security definer, because the
-- household_members table itself stays closed to browsers (RLS on, no policies).
create or replace function public.is_active_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and auth_user_id = (select auth.uid())
      and status = 'active'
  )
$$;

revoke all on function public.is_active_household_member(uuid) from public, anon;
grant execute on function public.is_active_household_member(uuid) to authenticated;

-- Signed-in members may receive broadcasts on their own household's channel. There is no insert
-- policy: only the API sends, and its secret key is not subject to these rules.
drop policy if exists "household members receive household broadcasts" on realtime.messages;
create policy "household members receive household broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    -- "case" so a topic that is not "household:<uuid>" is refused before anything tries to read it as a uuid
    and case
      when (select realtime.topic()) ~ '^household:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_active_household_member(substring((select realtime.topic()) from 11)::uuid)
      else false
    end
  );
