# HomeBase Azure SQL Database Implementation Plan

## Purpose

This document describes the changes required to move HomeBase from browser-only `localStorage` storage to an Azure SQL Database with SQL authentication.

This is a planning document only. No application or database changes should be applied until this plan is approved.

## Important Architecture Constraint

The current application is a React/Vite frontend deployed to GitHub Pages. A browser application must not connect directly to Azure SQL because that would expose the SQL username, password, and database endpoint to every user.

The required architecture is:

```text
React/Vite frontend
        |
        | HTTPS API requests
        v
Backend API service
        |
        | Private server-side SQL connection
        v
Azure SQL Database
```

The backend API must be hosted separately from GitHub Pages. Suitable options include Azure App Service, Azure Container Apps, Azure Functions, or another server capable of running a Node.js API.

## Scope

### Included

- Azure SQL schema for household profiles and expenses
- Backend API for reading and writing HomeBase data
- Replacement of the current localStorage expense repository
- SQL authentication through server-side environment variables
- Migration of existing localStorage data
- CORS, firewall, HTTPS, and secret-management requirements
- Local development and production deployment configuration

### Not Included Yet

- Applying SQL scripts to the Azure database
- Creating backend files
- Changing the React application
- Creating Azure resources or deployment pipelines
- Full user authentication and account management

## Current State

The current v1 application:

- Uses React + Vite + Tailwind CSS
- Stores the profile in `homebase_user`
- Stores transactions in `homebase_expenses`
- Uses two named people in one household
- Supports categories, tags, descriptions, dates, payer, split type, and recurring transactions
- Is deployed as a static frontend through GitHub Pages

The current localStorage transaction fields are approximately:

```text
id
categoryId
amount
tag
description
date
whoPaid
splitType
isRecurring
recurringFrequency
nextDueDate
```

## Proposed Database Schema

The schema uses a household as the ownership boundary. A household has two or more members, and every expense belongs to exactly one household.

### `Households`

| Column | Type | Rules |
| --- | --- | --- |
| `HouseholdId` | `uniqueidentifier` | Primary key, default `NEWSEQUENTIALID()` |
| `Name` | `nvarchar(100)` | Required |
| `CreatedAtUtc` | `datetime2(3)` | Required, default UTC time |
| `UpdatedAtUtc` | `datetime2(3)` | Required, default UTC time |

### `HouseholdMembers`

| Column | Type | Rules |
| --- | --- | --- |
| `HouseholdMemberId` | `uniqueidentifier` | Primary key, default `NEWSEQUENTIALID()` |
| `HouseholdId` | `uniqueidentifier` | Foreign key to `Households` |
| `DisplayName` | `nvarchar(100)` | Required |
| `CreatedAtUtc` | `datetime2(3)` | Required, default UTC time |
| `UpdatedAtUtc` | `datetime2(3)` | Required, default UTC time |

A unique constraint should prevent duplicate display names within the same household.

### `Categories`

Categories should be seeded from the existing frontend category configuration.

| Column | Type | Rules |
| --- | --- | --- |
| `CategoryId` | `nvarchar(50)` | Primary key, for example `car` or `going-out` |
| `Name` | `nvarchar(100)` | Required |
| `Description` | `nvarchar(300)` | Nullable |
| `SortOrder` | `int` | Required |
| `IsActive` | `bit` | Required, default `1` |

Emoji, colors, and icons can remain frontend presentation data initially. If categories need to be administered later, add those fields to this table.

### `Expenses`

| Column | Type | Rules |
| --- | --- | --- |
| `ExpenseId` | `uniqueidentifier` | Primary key, default `NEWSEQUENTIALID()` |
| `HouseholdId` | `uniqueidentifier` | Required foreign key |
| `CategoryId` | `nvarchar(50)` | Required foreign key to `Categories` |
| `Amount` | `decimal(19,4)` | Required, greater than zero |
| `Tag` | `nvarchar(100)` | Nullable |
| `Description` | `nvarchar(500)` | Nullable |
| `ExpenseDate` | `date` | Required |
| `PaidByMemberId` | `uniqueidentifier` | Required foreign key to `HouseholdMembers` |
| `SplitType` | `varchar(10)` | Required, values `one` or `split` |
| `IsRecurring` | `bit` | Required, default `0` |
| `RecurringFrequency` | `varchar(10)` | Nullable, values `weekly`, `monthly`, or `yearly` |
| `NextDueDate` | `date` | Nullable |
| `CreatedAtUtc` | `datetime2(3)` | Required, default UTC time |
| `UpdatedAtUtc` | `datetime2(3)` | Required, default UTC time |
| `DeletedAtUtc` | `datetime2(3)` | Nullable, for optional soft deletion |

### Recommended constraints

- `Amount > 0`
- `SplitType IN ('one', 'split')`
- `RecurringFrequency IS NULL OR RecurringFrequency IN ('weekly', 'monthly', 'yearly')`
- `IsRecurring = 0 OR (RecurringFrequency IS NOT NULL AND NextDueDate IS NOT NULL)`
- `PaidByMemberId` must belong to the same household as the expense
- `CategoryId` must reference an active or historically valid category

## Recommended Indexes

```sql
CREATE INDEX IX_Expenses_Household_ExpenseDate
    ON dbo.Expenses (HouseholdId, ExpenseDate DESC);

CREATE INDEX IX_Expenses_Household_Category_ExpenseDate
    ON dbo.Expenses (HouseholdId, CategoryId, ExpenseDate DESC);

CREATE INDEX IX_Expenses_Household_NextDueDate
    ON dbo.Expenses (HouseholdId, NextDueDate)
    WHERE IsRecurring = 1 AND DeletedAtUtc IS NULL;

CREATE INDEX IX_HouseholdMembers_Household
    ON dbo.HouseholdMembers (HouseholdId);
```

The final SQL script should be reviewed before execution because SQL Server filtered-index syntax and constraint behavior must match the selected Azure SQL compatibility level.

## Seed Data

The deployment should include a repeatable seed migration for the eight current categories:

- `car`
- `subscriptions`
- `groceries`
- `entertainment`
- `going-out`
- `utilities`
- `home`
- `other`

The seed script must be idempotent, using an upsert or `IF NOT EXISTS` approach so it can run safely more than once.

## Backend API Changes

A backend service is required before the frontend can use Azure SQL.

### Suggested endpoints

```text
POST   /api/households
GET    /api/households/:householdId
GET    /api/households/:householdId/members
GET    /api/households/:householdId/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
POST   /api/households/:householdId/expenses
PATCH  /api/households/:householdId/expenses/:expenseId
DELETE /api/households/:householdId/expenses/:expenseId
POST   /api/households/:householdId/expenses/generate-recurring
```

The backend should:

- Validate all request bodies server-side
- Validate that the payer belongs to the household
- Validate category IDs against the database
- Use parameterized SQL or a trusted ORM/query builder
- Return consistent JSON error responses
- Use UTC timestamps
- Apply household ownership checks to every expense query
- Avoid returning SQL errors or credentials to clients
- Implement pagination before transaction volume grows

## Authentication and Authorization

The current app only asks for two display names. That is not sufficient to securely identify a household once data is stored centrally.

Before production multi-device sync, the application needs at least one of these approaches:

1. Add account authentication through an identity provider and associate users with households.
2. Use an invite-based household token with server-side validation.
3. Keep the database private to a single trusted user and treat the API as a controlled personal service.

Do not use a household ID or SQL credential as an authorization secret. A public household ID must never be enough to access or modify another household's expenses.

## SQL Authentication Configuration

The SQL username and password must exist only on the backend host.

Example server-side environment variables:

```text
AZURE_SQL_SERVER=homebase.database.windows.net
AZURE_SQL_DATABASE=HomeBase
AZURE_SQL_USER=<server-side-sql-user>
AZURE_SQL_PASSWORD=<server-side-secret>
AZURE_SQL_ENCRYPT=true
```

Do not commit these values to Git, the frontend bundle, `.env` files that are tracked, or GitHub Pages assets.

For production, store the secret in Azure Key Vault or the hosting platform's secret configuration. Rotate the SQL password if it has been shared outside the secure Azure configuration.

## Azure SQL Security Configuration

Before connecting the backend:

- Use the Azure SQL server firewall to allow only the backend's outbound IP addresses where possible.
- Do not allow broad access from all Azure services unless there is no narrower option.
- Require encrypted connections.
- Use the least-privileged SQL user possible.
- Prefer a dedicated application database user instead of the server administrator account.
- Enable auditing and diagnostic logging.
- Review Microsoft Defender for SQL recommendations if the database contains personal or financial information.
- Use private endpoints or a virtual network integration when the selected hosting plan supports it.
- Keep the database administrator credentials separate from the application credentials.

## Frontend Changes Required Later

The React app will need a data access layer to replace direct calls to `useLocalStorage`.

Recommended shape:

```text
src/core/api/client.js
src/core/api/expensesApi.js
src/core/hooks/useExpenses.js
```

The frontend changes should include:

- Replace localStorage reads and writes with API calls.
- Add loading, retry, offline, and error states.
- Keep a temporary migration path for existing localStorage data.
- Send only the household/user session token to the API.
- Never import SQL configuration into frontend code.
- Preserve the existing category, dashboard, recurring, and balance interfaces.

## LocalStorage Migration

Existing users have data under:

```text
homebase_user
homebase_expenses
```

The migration should be explicit and one-time:

1. Detect existing localStorage data.
2. Ask the user to sign in or identify the destination household.
3. Create or select the household and its two members.
4. Map each local transaction to a database expense.
5. Preserve the original date, amount, category, payer, split, and recurring fields.
6. Mark migration complete only after the API confirms every record.
7. Keep the local data temporarily as a rollback aid, then provide a clear cleanup path.
8. Handle duplicate migration attempts with a client migration ID or server-side idempotency key.

The migration must not silently delete local data after a partial failure.

## Recurring Expense Generation

Recurring generation should move to the backend so it is consistent across devices.

Recommended behavior:

- Run generation when an authenticated household loads expenses and optionally through a scheduled backend job.
- Use a database transaction for generation and next-due-date updates.
- Make generation idempotent. A request repeated twice must not create duplicate occurrences.
- Store an occurrence or source reference if necessary to enforce uniqueness.
- Generate only dates that are due, according to the selected frequency.
- Preserve the original recurring template and update `NextDueDate` after successful generation.

## Deployment Changes

### Frontend

- Keep Vite `base: '/HomeBase/'` for the GitHub Pages project site.
- Configure the production API URL as a public, non-secret value, for example `VITE_API_BASE_URL`.
- Configure GitHub Pages to serve the built frontend.
- Do not put Azure SQL connection strings in GitHub Actions frontend variables or the built assets.

### Backend

- Deploy the API to Azure App Service, Azure Container Apps, Azure Functions, or another server host.
- Configure SQL environment variables through the host's secret settings.
- Configure CORS to allow only the production GitHub Pages origin and approved local development origins.
- Enable HTTPS and reject insecure production requests.
- Add health checks that verify API availability without exposing database details.
- Add structured logs and alerting for failed database connections.

## Suggested Implementation Sequence

1. Confirm the Azure SQL server/database name, region, pricing tier, and allowed backend hosting option.
2. Create a database user with least-privilege permissions.
3. Apply the schema and category seed migration.
4. Create the backend API and database connection module.
5. Add backend tests for household isolation, validation, CRUD, and recurring generation.
6. Deploy the backend with secrets configured outside source control.
7. Add frontend API client and replace localStorage persistence.
8. Implement the one-time localStorage migration.
9. Test on mobile and desktop with two devices or browser profiles.
10. Deploy the frontend and verify the GitHub Pages origin can reach the API.
11. Disable or remove temporary migration behavior after the migration period.

## Verification Checklist

### Database

- [ ] Schema migration completes successfully
- [ ] Category seed is repeatable
- [ ] Constraints reject invalid expense records
- [ ] Indexes exist and are used for household/date queries
- [ ] Application SQL user cannot perform administrative operations

### Backend

- [ ] SQL credentials are server-side only
- [ ] All queries are parameterized
- [ ] Household authorization is enforced
- [ ] CRUD endpoints work
- [ ] Recurring generation is idempotent
- [ ] CORS allows only approved origins
- [ ] HTTPS is required in production

### Frontend

- [ ] Existing local data can be migrated
- [ ] Add, edit, delete, category filtering, dashboard, and recurring flows still work
- [ ] Loading and API failure states are visible
- [ ] No SQL hostname, username, password, or connection string appears in the bundle
- [ ] GitHub Pages deployment still uses `/HomeBase/`

## Decisions Needed Before Implementation

- Backend hosting choice
- Authentication/household access model
- Whether to use raw parameterized SQL, `mssql`, Prisma, or another data layer
- Whether soft deletion is required
- Whether recurring generation runs on request, on a schedule, or both
- Whether the existing demo data should remain available in production
- Azure SQL server/database names and region
- Production frontend origin and backend API origin

## Approval Gate

Approval of this document means approval to begin implementation work. It does not authorize running SQL scripts, storing credentials, creating Azure resources, or changing the frontend persistence layer yet.
