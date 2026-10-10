# HomeBase Implementation Plan v2

## Purpose

Upgrade HomeBase from a two-person expense tracker into a secure multi-user household application. A household may contain any number of members, and each member must have an authenticated account before accessing shared data.

This plan builds on the completed v1 frontend, Render backend, and Supabase database setup.

## V2 Goals

- Support any number of members in a household.
- Add Supabase Auth for sign-up, login, logout, email verification, and password reset.
- Link authenticated users to household membership records.
- Secure every backend API route.
- Add Row Level Security policies in Supabase.
- Allow owners or admins to invite and manage household members.
- Generalize expense, dashboard, and balance logic beyond two people.
- Preserve the existing category, recurring transaction, and localStorage migration work.

## V2 Architecture

```text
React frontend on GitHub Pages
	|
	| Supabase Auth session and bearer token
	v
Render Node.js API
	|
	| Authenticated database requests
	v
Supabase Auth + PostgreSQL + Row Level Security
```

The Supabase secret/service key remains only in Render environment variables. It must never be included in the React bundle.

## Current V1 Limitations

The current application assumes two people through fields such as:

```text
user.person1
user.person2
```

The current backend also accepts household IDs without requiring an authenticated user token. This is acceptable for testing but not for a public multi-household application.

The current database already models household members separately, but members are not yet linked to Supabase Auth users.

## Authentication Model

Supabase Auth is the identity system. Supabase creates and manages users in `auth.users`.

The application should not copy passwords or authentication credentials into public application tables. The public membership table should store the relationship between a login identity and a household member.

Authentication flows:

- Sign up with email and password.
- Confirm email when email confirmation is enabled.
- Sign in and receive a Supabase access token.
- Refresh the session through the Supabase client.
- Sign out and clear the local session.
- Reset a forgotten password through Supabase Auth.

## Database Changes

### `household_members` additions

Add:

| Column | Type | Rules |
| --- | --- | --- |
| `auth_user_id` | `uuid` | Nullable during migration; references `auth.users(id)` |
| `role` | `text` | Required; values `owner`, `admin`, or `member` |
| `status` | `text` | Required; values `pending`, `active`, or `removed` |
| `invited_email` | `text` | Nullable |
| `invited_at` | `timestamptz` | Nullable |
| `accepted_at` | `timestamptz` | Nullable |

Add a unique constraint on active `auth_user_id` and household membership as appropriate. A user may belong to multiple households, but should not have duplicate active membership in the same household.

### `household_invitations`

Create an invitation table containing:

- Invitation ID
- Household ID
- Invited email
- Invited role
- Secure, expiring token or invitation reference
- Created timestamp
- Expiration timestamp
- Accepted timestamp
- Revoked timestamp

Invitation tokens must be generated server-side, stored securely, and never be predictable.

### `expenses`

Keep the current expense relationship through `household_id` and `paid_by_member_id`. The payer must reference an active member of the same household.

No expense should be authorized by a client-supplied member ID alone. The API must validate that the authenticated user can act for the requested household.

## API Security

Every protected request must include:

```text
Authorization: Bearer <supabase-access-token>
```

Render middleware should:

1. Read the bearer token.
2. Verify it with Supabase Auth.
3. Identify the authenticated user.
4. Check membership in the requested household.
5. Check the member role for administrative operations.
6. Reject unauthorized requests with `401` or `403`.

Protected routes include:

```text
GET    /api/households/:householdId
GET    /api/households/:householdId/members
POST   /api/households/:householdId/members/invitations
PATCH  /api/households/:householdId/members/:memberId
DELETE /api/households/:householdId/members/:memberId
GET    /api/households/:householdId/expenses
POST   /api/households/:householdId/expenses
PATCH  /api/households/:householdId/expenses/:expenseId
DELETE /api/households/:householdId/expenses/:expenseId
```

The household ID is an identifier, not an authorization credential. Knowing it must not grant access.

## CORS and Secrets

Replace the current permissive CORS configuration with an allowlist containing:

- The production GitHub Pages origin
- The approved local development origin, only when needed

Keep these values only in Render environment configuration:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
ALLOWED_ORIGINS
```

Rotate any secret that has been exposed in source control, screenshots, logs, or chat.

## Row Level Security

Enable RLS on households, household members, invitations, and expenses.

Policies should enforce:

- A user can read a household only when an active membership exists.
- A user can read household members only for their own active households.
- A user can read expenses only for their own active households.
- A member can add expenses for a household they belong to.
- A member can update or delete only according to role and product rules.
- Owners and admins can manage invitations and members.
- Removed or pending members cannot access household data.

The service-role key bypasses RLS, so Render must enforce authorization itself. RLS remains an important defense-in-depth layer and protects against accidental direct client access.

## Household Management

### Household creation

The first authenticated user creates a household and becomes its `owner`.

### Invitations

Owners or admins enter an email address and role. The backend creates an expiring invitation. The invited user signs in or creates an account, then accepts the invitation.

### Member management

Owners and admins can:

- View all members
- Change member roles within authorization limits
- Revoke pending invitations
- Remove members

Members can:

- View active household members
- Add expenses
- View shared expenses

The application must prevent removing the last owner without transferring ownership first.

## Frontend Changes

### Authentication UI

Create:

```text
src/modules/Auth/pages/Login.jsx
src/modules/Auth/pages/Signup.jsx
src/modules/Auth/pages/ResetPassword.jsx
src/modules/Auth/hooks/useAuth.js
```

The app should show the authenticated application shell only after a valid session exists.

### API client

Update the API client to attach the current Supabase access token to every protected Render request.

The frontend must use only the Supabase publishable/anon key for authentication. It must never use the secret/service-role key.

### Household state

Replace the two-person profile assumption with a household context containing:

```text
current user
current household
household members
current user's role
```

### Expense form

The payer selector should list all active household members rather than only two names.

### Dashboard

Generalize calculations to:

- Total spending by all members
- Total paid by each member
- Each member's owed share
- Household settlement suggestions
- Category totals

The dashboard should not assume that exactly two people exist. If settlement logic remains pairwise, document that limitation explicitly; otherwise implement a multi-person settlement algorithm.

## LocalStorage Migration

Existing keys:

```text
homebase_user
homebase_expenses
homebase_household
```

Migration sequence:

1. Detect existing local data.
2. Require the user to authenticate.
3. Create or select a household.
4. Create member records for the existing names.
5. Associate the current authenticated user with the appropriate member.
6. Invite or associate the second existing person separately.
7. Upload local expenses using server-issued IDs and member IDs.
8. Confirm every upload succeeded.
9. Mark migration complete.
10. Preserve local data temporarily as a rollback backup.

Use an idempotency key or migration ID so refreshing during migration does not duplicate expenses.

## Implementation Phases

### Phase 1: Authentication foundation

- Create Supabase Auth configuration.
- Add login, signup, logout, and session persistence.
- Add protected application routing.
- Add auth error and loading states.

### Phase 2: Membership schema

- Add `auth_user_id`, role, and status to household members.
- Create invitations table.
- Add migration scripts and indexes.
- Seed or migrate existing household data.

### Phase 3: Secure backend

- Add bearer-token middleware.
- Add authenticated user lookup.
- Add household membership authorization.
- Secure every household and expense endpoint.
- Restrict CORS.
- Add safe production error responses.

### Phase 4: RLS policies

- Enable and test policies for all protected tables.
- Verify cross-household reads and writes fail.
- Verify removed members lose access.
- Verify service-role backend behavior is intentional.

### Phase 5: Multi-user household UI

- Add member list.
- Add invitation flow.
- Add role management.
- Add remove member flow.
- Replace two-person profile fields.

### Phase 6: Multi-member expenses and dashboard

- Update payer selection.
- Update transaction display.
- Generalize totals and balances.
- Add multi-member settlement behavior.

### Phase 7: Migration and production verification

- Migrate existing localStorage data.
- Test with multiple accounts and households.
- Test unauthorized access.
- Test mobile and desktop flows.
- Deploy the secured frontend and backend.

## Verification Checklist

### Authentication

- [ ] Users can sign up and log in.
- [ ] Sessions persist after refresh.
- [ ] Logout clears protected application state.
- [ ] Password reset works.
- [ ] Unauthenticated users cannot access household data.

### Authorization

- [ ] Users can access only their own households.
- [ ] Household IDs cannot be used as access credentials.
- [ ] Members cannot perform owner-only actions.
- [ ] Removed members lose access.
- [ ] Cross-household expense reads fail.
- [ ] Cross-household expense writes fail.

### Database

- [ ] Membership migration is repeatable.
- [ ] Invitation tokens expire.
- [ ] RLS policies are enabled and tested.
- [ ] The service key is never in the frontend bundle.
- [ ] Database constraints protect household relationships.

### Frontend

- [ ] More than two members can be displayed.
- [ ] Any active member can be selected as payer.
- [ ] Dashboard calculations support more than two members.
- [ ] Existing categories and recurring transactions still work.
- [ ] Existing localStorage data can be migrated safely.

## Decisions Before Implementation

- Whether each household member must have an account immediately or may remain an unclaimed member.
- Whether invitations are email-based or code-based.
- Which roles are needed.
- Whether members may add expenses without approval.
- Whether expenses can be edited or deleted by any member or only by the creator/admin.
- Whether multi-person settlement is required in v2 or deferred.
- Whether a user may belong to multiple households.
- Whether demo data remains available in production.

## Approval Gate

V2 implementation should begin with authentication and authorization, not additional expense features. The current Render API is suitable for development but should not be considered public-ready until bearer-token validation, household membership checks, CORS restrictions, and RLS policies are implemented.