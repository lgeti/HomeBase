-- HomeBase invite links: an invitation belongs to a pending member, not to an email address.
-- Whoever opens the link and signs in (with any account) becomes that member.
-- Run after 012_food_location.sql in the Supabase SQL Editor.
-- Run this right before deploying the server version with link-only invites.

alter table public.household_invitations
  add column if not exists household_member_id uuid
    references public.household_members(household_member_id) on delete cascade;

-- Point existing invitations at the pending member they were sent to
update public.household_invitations invitation
set household_member_id = member.household_member_id
from public.household_members member
where invitation.household_member_id is null
  and member.household_id = invitation.household_id
  and member.invited_email = invitation.invited_email
  and member.status <> 'removed';

-- Invitations that no longer match a member cannot be accepted
delete from public.household_invitations where household_member_id is null;

alter table public.household_invitations
  alter column household_member_id set not null;

create index if not exists ix_household_invitations_member
  on public.household_invitations (household_member_id);

alter table public.household_invitations drop column if exists invited_email;
alter table public.household_members drop column if exists invited_email;
