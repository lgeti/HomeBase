# HomeBase Product Direction

## North Star

HomeBase should become the calm, shared home base for any household: couples, families and flatmates. It brings shared money, shopping, the fridge and pantry, the household's belongings and chores into one app, and makes everyday upkeep easy to capture, easy to understand, and increasingly automatic without turning into a dense accounting or project tool.

HomeBase is offered as a service anyone can sign up for. Signed-out visitors see a landing page that explains the product and its plans; a new account creates a household, invites the people who live there, and starts with a few tips. There is a **Free** plan that covers everyday household use and a paid **Pro** plan (per household) for heavier AI use such as unlimited receipt scans, recipe suggestions and connecting AI assistants. Payments (Stripe) come later; until then Pro prices on the landing page are placeholders (`src/config/plans.js`).

The product started as a two-person expense tracker. It keeps that clarity — a small set of clear categories, fast entry, shared settlement math — while supporting households of any size and adding the infrastructure needed for secure accounts, plan limits, bank imports, budgets, and synchronized data.

## Product Principles

### 1. Keep the household model simple

A household is a group of people who share a home, whether that is two partners, a family or four flatmates. Preserve the direct language of “who paid?”, “split equally”, and “who owes who?” before introducing generalized accounting concepts. The data model should be extensible, but the interface should remain understandable to a household using the app casually, and should read naturally whether there are two members or six.

### 2. Make automation trustworthy

Bank synchronization should reduce manual work, not create uncertainty. Every imported transaction needs a visible source, stable identity, import timestamp, pending/posted state where available, and a predictable duplicate-matching rule. Users should be able to review, recategorize, exclude, and undo imports.

### 3. Treat privacy and ownership as product features

Personal finance data is sensitive. Every server query and mutation must be scoped to the authenticated user and household. Bank consent tokens and private keys must remain server-side, never in localStorage or client bundles. The app should provide a clear connection-management screen where users can see what is connected, when it last synced, and how to disconnect it.

### 4. Use visual hierarchy to reduce financial anxiety

The visual system should remain warm, polished, and restrained. Use color for category recognition and state, not decoration. Use progress bars and charts to answer specific questions: how much has been spent, what remains in a budget, and which category is changing. Keep empty states helpful and avoid making the dashboard feel like a warning panel.

## Product Roadmap

| Stage | Outcome | Main work |
| --- | --- | --- |
| 1. Stabilize the local MVP | A reliable single-device household tracker | Add edit support, search and filters, automated tests, accessibility checks, responsive verification, and idempotent recurring generation |
| 2. Secure shared foundation | Authenticated, multi-device household data | Add user and household records, database-backed transactions, authorization rules, migrations, server validation, and a local-data import path |
| 3. Budgets and planning | Users can set limits and understand progress | Add monthly category budgets, progress indicators, remaining amounts, overspend states, budget history, and optional alerts |
| 4. Bank connection | Users can connect a bank account safely | Add a server-side Enable Banking OAuth/consent flow, Gorenjska Banka selection, callback handling, secure connection records, and a connection status UI |
| 5. Transaction synchronization | Imported bank data becomes useful and safe | Add account discovery, transaction normalization, stable external IDs, duplicate detection, pending-to-posted reconciliation, manual review, and sync history |
| 6. Shared household collaboration | Everyone in the household sees the same current information | Add real-time or near-real-time refresh, conflict handling, activity history, and household member management |
| 7. Modular home base | Finance is the first module, not the last | Shopping lists, fridge and pantry with recipe suggestions, inventory, chores and receipt scanning are built (see `docs/Features.md`). Meal planning and document storage later |
| 8. Public service | Anyone can find, sign up for and pay for HomeBase | Landing page with Free vs Pro pricing, onboarding (household, invite, tips), per-household isolation and plan limits on the API, then Stripe billing for Pro |

## Recommended Technical Direction

The current repository is a React + Vite + Tailwind client on GitHub Pages, an Express API on Render, and Supabase for authentication and PostgreSQL. All data is stored in the database and scoped to the authenticated household by the API; the browser no longer stores expenses locally.

The next production architecture should use a server-backed application with a relational database. The core domain should be organized around `users`, `households`, `household_members`, `transactions`, `categories`, `budgets`, `bank_connections`, `bank_accounts`, and `sync_runs`. Imported transactions should retain both normalized fields for HomeBase and the provider's external identifiers for reconciliation.

Enable Banking should be implemented behind a server-side integration boundary. The browser should begin a consent flow and receive only a short-lived, application-controlled state value. The server should create the provider session, handle the callback, exchange or store provider credentials according to the provider's contract, fetch accounts and transactions, and write normalized records scoped to the authenticated household. Payment initiation is outside the current product scope; the initial bank integration should request account-information access only.

## Definition of Done for the Next Major Milestone

The next major milestone is complete when a user can sign in, create or join a household, add and edit transactions, see only that household's records, define category budgets, and view budget progress across devices. The app should have automated unit tests for calculations and authorization tests that prove one household cannot read or mutate another household's data.

Bank synchronization should follow after this milestone. It is ready when there is a documented consent flow, server-side secret handling, stable transaction identity, duplicate-safe imports, explicit connection status, a manual sync action, and a clear recovery path for expired or revoked bank consent.

## Graphify: Recommended Use

Graphify is useful for **development-time codebase understanding and architecture documentation**, not as a user-facing finance feature. It can scan the HomeBase repository, build a local AST-based knowledge graph, and emit artifacts such as `graphify-out/graph.json`, `graphify-out/graph.html`, and `graphify-out/GRAPH_REPORT.md`. The scan already produced a code graph for this repository with 98 nodes and 170 edges using the local, no-LLM `graphify update . --no-cluster` workflow.

Use Graphify for repository orientation, dependency tracing, impact analysis before refactors, and generating a visual call-flow/architecture reference. Keep its generated output out of the production bundle unless the team explicitly wants a developer-only documentation site. It should not receive bank credentials, transaction data, or production secrets, and it should not be embedded into the runtime path of the finance application.
