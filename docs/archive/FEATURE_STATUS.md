# HomeBase Feature Status

**Repository:** `lgeti/HomeBase`  
**Current branch:** `main`  
**Last inspected:** 2026-08-12  
**Status source:** product specification, implementation plan, source tree, and a local Graphify code scan.

## Executive Summary

HomeBase is a working React/Vite mobile-first expense tracker for two people sharing a household. The current implementation is a local-only MVP: it stores the profile and transactions in browser `localStorage`, calculates monthly summaries in the client, and does not yet have a backend, authentication, bank connectivity, budgets, or cross-device synchronization.

The repository is further along than a blank scaffold. The main expense workflow is usable end to end: a household can set up two names, select a category, add a transaction, view monthly/category totals, remove transactions, and see recurring transactions generated when due. The next major product step is not visual polish alone; it is moving from the local-only MVP to secure, multi-user persistence and a bank-import architecture without losing the simple household-first experience described in the specification.

## Feature Matrix

| Area | Status | What exists now | Remaining work |
| --- | --- | --- | --- |
| Project foundation | Done | React 18, Vite, Tailwind CSS, GitHub Pages deployment script, modular `src/components`, `src/core`, and `src/modules` structure | Add automated tests, CI checks, and a production deployment decision beyond the current GitHub Pages target |
| Mobile-first layout | Done | Responsive Tailwind layout, bottom navigation, category tabs, add-transaction sheet, and desktop-friendly centered content | Verify 375px, 768px, and wide-screen behavior with browser screenshots and accessibility checks |
| Household profile setup | Done | First-launch profile screen stores `person1` and `person2` as `homebase_user` | Replace local profile storage with authenticated user and household records when a backend is introduced |
| Expense categories | Done | Eight configured categories: Car, Subscriptions, Groceries, Entertainment, Going Out, Rent & Utilities, Home, and Other. Each has an emoji, color, description, and optional subcategories | Allow category customization only after the default taxonomy is stable; preserve existing category IDs for data compatibility |
| Add transaction | Done | Amount, category, optional tag, description, date, who paid, one-person or 50/50 split, and recurring toggle | Add edit mode, stronger validation, duplicate protection, and server-side persistence |
| Transaction list | Partial | Current-month chronological list, category tabs, amounts, payer, dates, tags, and tap-to-delete | Add search, person filter, date-range filter, edit action, pagination/virtualization if the dataset grows, and clearer empty/error states |
| Monthly dashboard | Done | Month navigation, monthly total, category breakdown bars, person-paid shares, and running settlement calculation | Add a true chart component, cash-flow/remaining-balance context, and backend-derived totals |
| Recurring transactions | Done | Weekly, monthly, and yearly frequency fields; due transactions are generated on load; recurring data can be identified in the model | Make generation idempotent on the server, expose upcoming recurring items, support editing/cancellation, and handle timezone boundaries explicitly |
| Demo data | Done | Demo transaction set and a loader accessible from the current settings/demo action | Keep demo data clearly separated from real data and remove the demo affordance from production once onboarding is complete |
| Persistence | Done for MVP | Profile and expenses are persisted in browser `localStorage` | Migrate to a database with per-household ownership, migrations, backups, and conflict handling |
| Authentication | Not started | No account login or authenticated API | Add OAuth/session authentication and enforce ownership on every backend read and write |
| Backend/API | Not started | No server or API in this repository | Add a server layer, typed API procedures, validation, authorization, and observability |
| Budget goals | Not started | No budget table, budget UI, or progress indicators | Add category budgets, period definitions, progress calculations, alerts, and rollover policy |
| Bank connection | Not started | No Enable Banking client, OAuth consent flow, token storage, or bank-account model | Add a server-side Enable Banking integration, secure consent callbacks, encrypted credentials, sync jobs, and import reconciliation |
| Gorenjska Banka import | Not started | No bank-specific connection or transaction importer | Validate the live Enable Banking ASPSP configuration, request only account-information consent, normalize transactions, and test duplicates/pending entries |
| Cross-device sync | Not started | One browser is the source of truth | Add a shared backend and conflict strategy so both household members see the same data |
| Future modules | Planned | Product specification identifies chores, shopping list, meal planner, and documents as modular future areas | Do not build these until the expense and synchronization foundations are reliable |

## Current Project Progress

The repository contains one initial commit (`Init`) and has the complete v1 local-MVP path implemented in source code. The original implementation plan describes six phases. Based on the current source tree, Phases 1 through 5 are substantially implemented, while Phase 6 is only partially complete.

| Plan phase | Current assessment | Evidence |
| --- | --- | --- |
| 1. Foundation and core layout | Complete | Vite/Tailwind setup, profile setup, localStorage helpers, modular folders, and bottom navigation exist |
| 2. Category tabs and transaction list | Mostly complete | Category configuration, tab bar, category filtering, monthly total, chronological transaction list, and delete action exist |
| 3. Add transaction flow | Complete | `TransactionForm.jsx` implements validation and all core v1 fields, including recurring options |
| 4. Summary dashboard | Mostly complete | Dashboard includes month navigation, totals, category bars, person split, and settlement; a real chart and automated tests are still missing |
| 5. Recurring transactions | Mostly complete | Recurring fields and `applyRecurringTransactions` are wired into app startup; server-side idempotency and management controls are not applicable yet because storage is local-only |
| 6. Deployment and polish | Partial | GitHub Pages scripts and styling exist; responsive/accessibility verification, CI, test coverage, and production hardening remain |

## Progress Tracking Rules

This file records product capability status. `DIRECTION.md` records the intended product and technical direction. For active implementation work, maintain the repository TODO list as a separate checklist and mark an item complete only after the feature is implemented and verified.

Every new feature should be represented in three places: the relevant product goal in `DIRECTION.md`, a checklist item in the active TODO file, and an updated row in this matrix. This keeps implementation progress, product intent, and actual code status aligned.

## Recommended Next Milestone

The next milestone should be **Secure Shared Foundation**: introduce authenticated users and household ownership, move transactions into a database-backed API, preserve the current local-only data model through an import/migration path, and add budgets before bank synchronization. Enable Banking should be added only after the server-side ownership and secret-management boundary is in place, because bank consent tokens and imported financial data must never be handled solely in browser storage.
