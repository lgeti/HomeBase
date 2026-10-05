# HomeBase Database Restrictions and Behavior

This document summarizes the constraints and behavior defined by the SQL scripts in `server/db`.

## SQL scripts

- `001_initial_schema.sql` creates the initial tables, relationships, indexes, categories, and RLS settings.
- `002_multi_member_households.sql` adds authenticated ownership, membership roles/statuses, and invitations.
- `999_reset_application_data.sql` deletes application data for development/testing while preserving the schema, categories, and Supabase Auth users.

Run `002_multi_member_households.sql` after `001_initial_schema.sql`.

## Household restrictions

The `households` table requires:

- `household_id`: UUID primary key, generated automatically when omitted.
- `name`: required, trimmed length from 1 to 100 characters.
- `created_at_utc` and `updated_at_utc`: required timestamps with `now()` defaults.
- `owner_user_id`: added by the v3 migration as a UUID referencing `auth.users(id)`.

### Is `owner_user_id` required by the database?

**Not currently.** The migration adds `owner_user_id` as a nullable column:

```sql
alter table public.households
  add column if not exists owner_user_id uuid;
```

The foreign key means that when a value is supplied, it must refer to an existing Supabase Auth user. It does not prevent `NULL`.

Therefore, the database by itself can currently accept a household without an owner:

```sql
insert into public.households (name)
values ('Ownerless test household');
```

That is not the intended application behavior.

### Application behavior

The backend's `POST /api/households` route requires an authenticated request and sets the owner from:

```js
request.user.id
```

The client should not supply or choose the owner ID. The route creates the household with the authenticated user's ID and creates that user's active owner membership.

So the practical rule is:

> A household cannot be created through the application without an authenticated owner, even though the current database schema technically permits an ownerless row.

### Recommended future database hardening

After existing data has been checked and any ownerless rows have been repaired, make the owner mandatory at the database level:

```sql
alter table public.households
  alter column owner_user_id set not null;
```

This should be a separate migration, not added blindly to the existing migration, because it will fail if any existing household has `owner_user_id is null`.

## Household member restrictions

Each member requires:

- `household_member_id`: UUID primary key, generated automatically.
- `household_id`: required foreign key to `households`.
- `display_name`: required, trimmed length from 1 to 100 characters.
- `created_at_utc` and `updated_at_utc`: required timestamps with defaults.

The database prevents duplicate display names within one household:

```sql
unique (household_id, display_name)
```

The same display name can still exist in different households.

### Authenticated membership fields

The v3 migration adds:

- `auth_user_id`: optional foreign key to `auth.users(id)`.
- `role`: defaults to `member`; allowed values are `owner`, `admin`, and `member`.
- `status`: defaults to `active`; allowed values are `pending`, `active`, and `removed`.
- `invited_email`: optional email address associated with an invitation.
- `invited_at`: optional invitation timestamp.
- `accepted_at`: optional acceptance timestamp.

The database allows pending members without an authenticated user because `auth_user_id` is nullable. That supports invitation-based membership.

**An authenticated user can have only one non-removed membership row per household because of this partial unique index:

```sql
unique (household_id, auth_user_id)
where auth_user_id is not null and status <> 'removed'
```

Removing a member is intended to update `status` to `removed`, rather than deleting the row.

## Expense restrictions

Every expense requires:

- `expense_id`: generated UUID primary key.
- `household_id`: existing household.
- `category_id`: existing category.
- `amount`: numeric value greater than zero.
- `expense_date`: required date.
- `paid_by_member_id`: existing member from the same household.
- `split_type`: exactly `one` or `split`.

The composite foreign key ensures the payer belongs to the same household as the expense:

```sql
foreign key (household_id, paid_by_member_id)
references public.household_members(household_id, household_member_id)
```

Optional expense fields include `tag`, `description`, and `deleted_at_utc`.

### Recurring expenses

The database enforces these combinations:

- When `is_recurring = false`, `recurring_frequency` and `next_due_date` must both be `NULL`.
- When `is_recurring = true`, `recurring_frequency` must be `weekly`, `monthly`, or `yearly`, and `next_due_date` is required.

The application currently uses `deleted_at_utc` for soft deletion. Deleted expenses remain in the database but are excluded from normal active-expense queries.

## Categories

Categories use a text `category_id` primary key. The seed script inserts the default categories and updates them if they already exist.

Each category requires:

- `category_id`
- `name`
- `sort_order`
- `is_active`

The application normally reads only categories where `is_active = true`.

## Invitation restrictions

The v3 migration creates `household_invitations` with:

- `invitation_id`: generated UUID primary key.
- `household_id`: required household foreign key; deleting the household deletes its invitations.
- `invited_email`: optional email field.
- `invited_role`: required; only `admin` or `member` are allowed.
- `token_hash`: required and unique. The raw invitation token should not be stored.
- `expires_at`: required expiration timestamp.
- `accepted_at`: optional timestamp.
- `revoked_at`: optional timestamp.
- `created_at_utc`: timestamp with a `now()` default.

An invitation is intended to be usable only while it is unexpired, not accepted, and not revoked.

## Authentication and authorization

The SQL scripts enable Row Level Security on:

- `households`
- `household_members`
- `categories`
- `expenses`
- `household_invitations`

The initial schema does not create user-facing RLS policies. With RLS enabled and no matching policies, direct client access is blocked by default.

The backend uses the Supabase service-role key, which bypasses RLS. Therefore, the backend must enforce authorization itself:

- `requireAuth`: verifies the Supabase bearer token.
- `requireHouseholdMember`: verifies that the authenticated user has an active membership in the requested household.

RLS policies should still be added before allowing the frontend to access these tables directly or before treating the backend as the only long-term security boundary.

## Reset script behavior

`999_reset_application_data.sql` truncates:

- `expenses`
- `household_members`
- `households`

It uses `cascade`, so related household invitations are removed through the household relationship when the invitation table exists.

It does not delete:

- database tables or constraints
- categories
- Supabase Auth users

The `restart identity` clause has little practical effect for these UUID-based primary keys, but it is harmless.

Run the reset script only against a development or test project.

## Important implementation notes

1. The database currently permits ownerless households, but the application should not create them.
2. `owner_user_id` and the owner's `household_members` row are separate pieces of data. The database does not automatically create or synchronize the membership row when `owner_user_id` changes.
3. Creating a pending member row and creating an invitation are separate operations unless the backend explicitly performs both.
4. A pending member may have `auth_user_id = NULL`; accepting an invitation should set the authenticated user's ID, mark the member active, and record acceptance.
5. The backend should derive ownership from the verified token, never from a client-provided user ID.
6. Role values exist in the schema, but role-specific permissions still need to be enforced by backend checks and/or RLS policies.
