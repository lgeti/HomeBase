# HomeBase Current Features

## Navigation

- Bottom bar: Money, Shopping, + (add), Fridge, Chores
- Money holds the expense list and the dashboard as two tabs
- + adds what fits the section: an expense, a shopping item, or a fridge item
- Household is the button in the header; tapping it again goes back
- Chores shows a "Coming soon" page for now (planned in `BACKLOG.md`)

## Expenses

- Eight categories with emoji, colors and subcategories; adding from a category tab preselects it
- Add an expense: amount, category, type (subcategory), description, date, who paid, and "paid it all" or "split equally"
- The payer defaults to you; the date defaults to today (local date)
- Current-month list per category, newest first, with tap-to-delete (always visible on phones, with a confirmation)
- Tap an expense to edit it in the same sheet ("Edit Transaction", Save); unticking "Repeat this expense" stops a recurring expense. Edits to a recurring expense apply to future repeats; repeats already added stay, and changing its date or frequency never re-adds past ones. Automatically added repeats can be edited but not set to repeat
- Recurring expenses (weekly, monthly, yearly): the server creates each due occurrence automatically, including missed ones, labelled "Added automatically"
- Soft delete: deleted expenses stay in the database but are hidden

## Dashboard

- Month navigation with the monthly total and the two previous months
- Category breakdown
- What each member paid, their share, and who owes whom this month
- Totals always count the full amount; a split expense is shared equally between members who have joined

## Shopping

- One tab per list; a household starts with a "Groceries" list
- "+ New list" creates a list (for example Temu, IKEA or Marketplace); lists can be renamed and deleted from the ⋯ menu, with an in-app confirmation; names are unique within a household
- Quick add: type a name at the top of a list and press Enter
- + opens the full item sheet: buying or selling, name, list, quantity, price, link and note; tap an item to edit, move or delete it
- Tick an item when it's bought; a selling item is "Listed" until you tap "Mark sold"
- Bought and sold items move to a "Done" group that can be cleared (with a confirmation)
- Items show who added them; links open in a new tab and only web addresses are accepted
- Deleted lists and items stay in the database but are hidden

## Fridge

- What's in the fridge: name, quantity, optional expiry date and note
- Quick add at the top; + opens the full sheet with quick expiry buttons (Today, 3 days, 1 week, 2 weeks)
- "Use soon" at the top: expired items (in red) and items expiring within 3 days, soonest first; then everything else, dated items first
- "Used up" removes an item and can put it on a shopping list you pick; "Just remove" only removes it
- Tap an item to edit or delete it (delete is for mistakes, with a confirmation)
- Removed items stay in the database but are hidden; the database records whether each was used up or deleted

## Households and members

- Create a household when you first sign in
- Household screen: members with role (owner, admin, member) and status (joined, invited, not invited yet)
- Owners and admins create invite links for an email address; links work for 7 days and only for that email
- Opening an invite link before signing in keeps it through sign-in, sign-up and email confirmation, then joins the household
- Owners can remove anyone except themselves; admins can remove members (quiet ✕ with a confirmation)
- Only members who have joined can pay for or share expenses; invited people count once they accept
- Everyone can change their own display name (unique within the household)
- One household per person: accepting an invite is refused if you already belong to another household

## Sign-in

- Supabase Auth with Google or email and password (PKCE flow)
- Sign-up with password confirmation; sessions survive a refresh
- "Forgot your password?" sends a reset email; the link brings you back to choose a new password
- Sign out from the Household screen
- While the API is waking up (Render free plan), the loading screen explains the wait after 3 seconds

## Security

- Every API route except the health check requires a valid Supabase sign-in token
- Household routes require active membership in that household
- Role rules for inviting and removing members are enforced by the server (`server/src/authorization.js`); the app shows the Remove control using the same file
- Only the live site and local development may call the API from a browser (CORS)
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
