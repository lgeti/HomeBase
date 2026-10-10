# HomeBase Current Features

## Expenses

- Eight categories with emoji, colors and subcategories; adding from a category tab preselects it
- Add an expense: amount, category, type (subcategory), description, date, who paid, and "paid it all" or "split"
- The payer defaults to you; the date defaults to today (local date)
- Current-month list per category, newest first, with tap-to-delete (always visible on phones, with a confirmation)
- Recurring expenses (weekly, monthly, yearly): the server creates each due occurrence automatically, including missed ones, labelled "Added automatically"
- Soft delete: deleted expenses stay in the database but are hidden

## Dashboard

- Month navigation with the monthly total and the two previous months
- Category breakdown
- What each member paid, their share, and who owes whom this month

## Households and members

- Create a household when you first sign in
- Household screen: members with role (owner, admin, member) and status (joined, invited, not invited yet)
- Owners and admins create invite links for an email address; links work for 7 days and only for that email
- Opening an invite link before signing in keeps it through sign-in, sign-up and email confirmation, then joins the household
- Everyone can change their own display name (unique within the household)
- One household per person: accepting an invite is refused if you already belong to another household

## Sign-in

- Supabase Auth with Google or email and password (PKCE flow)
- Sign-up with password confirmation; sessions survive a refresh
- Sign out from the Household screen
- While the API is waking up (Render free plan), the loading screen explains the wait after 3 seconds

## Security

- Every API route except the health check requires a valid Supabase sign-in token
- Household routes require active membership in that household
- Role rules for inviting and removing members are enforced by the server (`server/src/authorization.js`)
- The database blocks direct browser access (RLS on, no policies); only the API's server key can read and write

## Architecture

```text
React app on GitHub Pages
        |
        | Supabase sign-in token on every request
        v
Express API on Render  ---->  Supabase Auth and PostgreSQL
```

Known gaps and planned work are tracked in `BACKLOG.md`.
