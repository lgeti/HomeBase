# HomeBase Implementation Plan v3

## Goal

Upgrade household management so one household can contain one or more authenticated members, with secure invitations and protected data access.

## V3 Scope

- Create a household with an owner and no required additional members.
- Add any number of members.
- Keep ownership separate from membership so the owner can leave membership without deleting the household.
- Invite members by secure, expiring link or email.
- Let invited users sign in with Google or email and join the household.
- Show all active members in the app and payer selector.
- Protect household and expense APIs.
- Add database policies for household isolation.

## Phase 1: Household Data Model

Update Supabase tables:

- Add `auth_user_id`, `role`, and `status` to `household_members`.
- Create `household_invitations` with household, token hash, role, expiry, and acceptance fields.
- Store the owner in `households.owner_user_id`.
- Add the owner as the first active member by default.
- Allow the owner membership to be removed while preserving ownership.
- Allow zero active member records after membership removal.

## Phase 2: Secure API

Update the Render API:

- Validate the Supabase bearer token on protected routes.
- Check that the authenticated user belongs to the requested household.
- Allow owner/admin actions only for authorized roles.
- Restrict CORS to approved frontend origins.
- Keep the Supabase secret key on Render only.

## Phase 3: Invitations

Add endpoints:

```text
POST   /api/households/:householdId/invitations
POST   /api/invitations/:token/accept
GET    /api/households/:householdId/members
DELETE /api/households/:householdId/members/:memberId
```

Invitation requirements:

- Random single-use token
- Server-side token hash
- Expiration date
- Optional invited email
- Owner/admin authorization
- Membership created only after authenticated acceptance

## Phase 4: Household UI

Replace the fixed two-person setup with:

- Household name
- Current user display name
- Household member list
- Invite member action
- Invitation link copy/share action
- Member role and status display
- Remove member action

The transaction payer field must list all active household members.

## Phase 5: Multi-member Calculations

Update dashboard and calculation utilities to support any number of members:

- Totals per member
- Shared expense shares
- Household totals
- Multi-person settlement suggestions

Remove assumptions based on `person1` and `person2`.

## Phase 6: Migration And Verification

- Link the current authenticated user to the existing household member.
- Migrate existing localStorage data without duplicates.
- Test owner, admin, member, pending, and removed states.
- Test multiple households and cross-household access denial.
- Test invitation expiry and reuse prevention.
- Deploy frontend and backend after security tests pass.

## Success Criteria

- A household can have zero or many active members while retaining an owner.
- Users can join only through an authenticated invitation flow.
- Users cannot read or change another household's data.
- Owners and admins can manage members according to role permissions.
- Expenses, payer selection, dashboard totals, and balances support all active members.
- Supabase RLS and Render authorization are enabled before public release.
