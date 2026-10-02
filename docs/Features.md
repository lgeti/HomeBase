# HomeBase Current Features

## Working Frontend

- React + Vite + Tailwind CSS
- Mobile-first responsive layout
- GitHub Pages deployment
- Cozy spring/cabin visual theme
- Category navigation with eight expense categories
- Category-specific subcategories and colors
- Current-month totals
- Transaction list sorted newest first
- Add transaction bottom sheet on mobile and modal on desktop
- Amount, category, tag, description, date, payer, and split type fields
- 50/50 split support
- Validation for required transaction fields
- Delete transactions
- Dashboard with monthly totals and category breakdown
- Person payment summary and balance calculation
- Previous/next month dashboard navigation
- Recurring transactions with weekly, monthly, and yearly frequency
- Recurring transaction badges
- Category preselection when adding from a category tab

## Authentication

- Supabase Auth client configured
- Google sign-in
- Email/password sign-in
- Email/password sign-up
- Password confirmation during sign-up
- Session restoration after refresh
- Sign out
- Login and sign-up screens
- PKCE OAuth flow

## Backend And Data

- Node.js/Express backend deployed on Render
- Supabase PostgreSQL database
- Supabase category seed data
- Household creation endpoint
- Household member lookup endpoint
- Category lookup endpoint
- Expense list endpoint
- Expense creation endpoint
- Expense update endpoint
- Soft-delete expense endpoint
- Frontend API client with Supabase access-token forwarding
- API-backed expense loading, creation, and deletion
- Production build and GitHub Pages deployment script

## Current Limitations

- Household setup still collects only two initial names.
- Household members are not yet linked to Supabase Auth users.
- Invitations and shareable household links are not implemented.
- Render API routes do not yet enforce bearer-token authorization.
- Row Level Security policies for user membership are not complete.
- Existing localStorage profiles and expenses are not fully migrated.
- Dashboard balance logic still assumes two people.
- CORS is not yet restricted to the production frontend origin.
- Password reset and email-management screens are not implemented.

## Current Architecture

```text
React frontend on GitHub Pages
        |
        | Supabase Auth session and API requests
        v
Node.js/Express API on Render
        |
        v
Supabase Auth and PostgreSQL
```
