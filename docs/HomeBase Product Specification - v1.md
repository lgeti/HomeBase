# HomeBase — Product Specification v1

## Overview

A **shared household management app** for two people living together. Starts as an expense tracker, built modularly so features like chores, shopping lists, or meal planning can be added later. Mobile-first, always.

## Users

Two named profiles — no full auth system needed. On first launch, you set your name and your partner's name. Every transaction is attributed to one of you.

## Expense Categories

Each category is a top-level tab with its own color and icon:

| Category | Icon | What it covers |
| --- | --- | --- |
| 🚗 Car | Red | Fuel, insurance, maintenance, parking, toll, tax |
| 📦 Subscriptions | Purple | Netflix, Spotify, gym, apps, recurring services |
| 🛒 Groceries | Green | Supermarket runs, market, delivery |
| 🎉 Entertainment | Yellow | Cinema, concerts, games, hobbies |
| 🍽️ Going Out | Orange | Restaurants, bars, cafés, takeaway |
| 🏠 Rent & Utilities | Blue | Rent, electricity, gas, water, internet, phone |
| 🔧 Home | Teal | Furniture, repairs, cleaning supplies, appliances |
| ✦ Other | Grey | Anything that doesn't fit |

## Core Features

1. **Add a Transaction**

    Every transaction captures:

   - **Amount** (required)
   - **Category** (required — one of the 8 above)
   - **Subcategory / tag** (optional — contextual per category, e.g. "fuel" under Car)
   - **Description** (optional free text)
   - **Date** (defaults to today)
   - **Who paid** (you or your partner)
   - **Split type:** one person paid vs shared 50/50
  
2. **Transaction Log**
   - Full chronological list, newest first
   - Filterable by: category, person, date range
   - Searchable by description
   - Each entry shows: emoji, description, tag, amount, who paid, date
   - Swipe or tap to delete
  
3. **Category Views**
   - Tap any category tab to see only that category's transactions
   - Category-level monthly total shown at top
   - Recurring/subscription items flagged with a 🔁 badge
  
4. **Summary Dashboard**
   - This month total across all categories
   - Breakdown by category (bar or donut)
   - Breakdown by person (who paid more this month)
   - Running balance: who owes who, and how much (e.g. "You owe partner €43")
   - Month selector to look at past months
  
5. **Recurring Transactions**
   - Mark any transaction as recurring (weekly / monthly / yearly)
   - Appears automatically on its next due date
   - Subscriptions category uses this heavily
   - Badge shows upcoming recurring payments

## Modular Architecture (Future Modules)

The app is built so new tabs can be registered without reworking the core:

- **Chores** — assign tasks, mark done, track who did what
- **Shopping list** — shared live list, check items off together
- **Meal planner** — weekly meals, auto-generates shopping list
- **Documents** — store car insurance, lease, warranty PDFs

Each module lives in its own folder and plugs into the central nav.

## Tech Stack

**Frontend:** React + Vite + Tailwind CSS
**Storage (v1):** localStorage (no backend needed to start)
**Storage (v2):** SQLite via a lightweight Node/Express backend, or Supabase
**Hosting:** Self-hosted via Docker, or Vercel for the frontend
**Sync:** In v1, one person's phone is the source of truth. In v2, real-time sync via a shared backend so both of you see updates instantly.

## What to Build First (Prioritised)

1. The 8-category tab structure with an "All" overview
2. Add transaction flow (the sheet that slides up)
3. Per-category transaction list
4. Monthly summary with person split
5. Recurring transaction support
6. Month history navigation
