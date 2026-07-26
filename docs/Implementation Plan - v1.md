# Implementation Plan: HomeBase Expense Tracker (Mobile-First, React + Vite)

*TL;DR: Build a modular React app with mobile-first Tailwind CSS, starting with category tabs → transaction UI → summary dashboard. Use localStorage v1 for persistence. Deploy to GitHub Pages. Structured to support future modules (Chores, Shopping, Meal Planner). Mobile-first strategy is baked into Tailwind config, component design, and responsive breakpoints.*

## Steps (6 Phases)

- **Phase 1:** **Project Foundation & Core Layout** (Prerequisite)

  - Initialize Vite + React + Tailwind
  - Create modular folder structure (`/modules/`, `/core/`, `/components/`)
  - Set up **mobile-first** Tailwind config (375px viewport, warm spring palette for cozy cabin aesthetic)
  - Build user profile setup flow (first launch: enter two names)
  - Create localStorage wrapper with transaction helpers

- **Phase 2:** **Category Tabs & Transaction List Structure** *depends on Phase 1*

  - Define 8-category config (emoji, color, icon, subcategories)
  - Build Tab Navigation (mobile-friendly, horizontal scroll)
  - Create Transaction List component (shows amount, who paid, date, tag)
  - Implement category filtering and month total display
  - Add swipe/tap to delete
  
- **Phase 3:** **Add Transaction Flow** (Modal/Sheet) *depends on Phase 2*

  - Build transaction form (amount, category, tag, description, date, who paid, split type)
  - Bottom-sheet UX on mobile, modal on desktop
  - Validation and error states
  - Auto-save to localStorage and refresh list

- **Phase 4:** **Summary Dashboard** *depends on Phase 1–3*

  - Monthly overview page with total + category breakdown (chart)
  - Person split breakdown (who paid more)
  - Running balance calculation ("You owe partner €X")
  - Month navigator (prev/next)
  - 50/50 split logic

- **Phase 5:** **Recurring Transactions** *depends on Phase 1–4*

  - Extend transaction model with recurring field (weekly/monthly/yearly)
  - Update form to mark recurring + set frequency
  - Auto-generate future transactions on due date
  - Badge indicator (🔁) on recurring items
  - Highlight in Subscriptions category

- **Phase 6:** Deployment & Polish depends on all prior phases

  - GitHub Pages setup (Vite config + deploy script)
  - Cozy cabin aesthetic finalization (warm colors, gentle typography, breathing room)
  - Responsive testing (375px, 768px, 1024px+)
  - Performance optimization, empty states, error handling
  
## Relevant Files (To Create)

### Config & Core

`src/config/categories.js` — 8-category definitions with emoji, colors, icons
`src/core/hooks/useExpenses.js` — fetch/save/delete transactions
`src/core/hooks/useLocalStorage.js` — generic localStorage wrapper
`src/core/utils/calculations.js` — totals, balance, 50/50 split math

### Components (Global)

`src/components/TabBar.jsx` — mobile tab navigation
`src/components/TransactionList.jsx` — reusable transaction display
`src/components/AddTransactionSheet.jsx` — bottom-sheet form container
`src/components/Button.jsx` — global button style

### Feature Module

`src/modules/Expenses/pages/CategoryView.jsx` — filtered transaction list
`src/modules/Expenses/pages/Dashboard.jsx` — monthly summary + charts
`src/modules/Expenses/components/TransactionForm.jsx` — form logic
`src/modules/Expenses/hooks/useExpenses.js` — Expenses-specific logic

### Config

`vite.config.js` — GitHub Pages base path configuration
`tailwind.config.js` — mobile-first, cozy spring palette
`package.json` — dependencies (React, Tailwind, chart library) + deploy script

## Verification

- Phase 1: App loads → welcome screen → name entry → localStorage persists
- Phase 2: Tab navigation filters correctly; month total calculates; delete works
- Phase 3: Form validates; new transactions save and appear; mobile UX is smooth (no horizontal scroll)
- Phase 4: Dashboard charts render; month nav works; balance calculation is accurate
- Phase 5: Recurring transactions mark, badge displays, auto-generate on due date
- Phase 6: Deployed to GitHub Pages; responsive on 375px, 768px, 1024px+; cozy aesthetic applied

## Decisions & Scope

Included (MVP):

- 8 expense categories, add/edit/delete, category views, monthly dashboard
- Recurring transactions, person split tracking, balance calculation
- Mobile-first Tailwind CSS, localStorage v1, cozy cabin aesthetic (spring palette)
- GitHub Pages deployment
  
Not Included (Future):

- Backend sync, real-time multi-user sync, full auth system
- Chores, Shopping List, Meal Planner modules (designed for modular expansion)
- PDF export, budget alerts, attachments
