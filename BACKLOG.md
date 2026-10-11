# HomeBase Backlog

Known issues and planned work. **Priority levels:** a higher number means more urgent. Level 0 is the lowest.

## Prioritized

| Level | Item | Details |
| --- | --- | --- |
| – | Nothing prioritized right now | |

## Planned: Shopping, Fridge and Chores (agreed 2026-10-11)

Three new sections next to Money. Everything is shared by the household, like expenses.

### Navigation (built)

The bottom bar becomes **Money · Shopping · ＋ · Fridge · Chores**.

- **Money** holds today's expense list and the dashboard as two tabs.
- **＋** adds whatever fits the section you are in: an expense, a shopping item, a fridge item or a chore.
- **Household** moves to a button in the header.

### Shopping (built; see docs/Features.md)

- One section with a tab per list, for example Groceries, Market, Temu, Amazon, Vinted, Facebook Marketplace or IKEA. It starts with a single "Groceries" list.
- **+ New list** creates a list with a name. Lists can be renamed and deleted (with an in-app confirmation).
- Every list works the same way. An item has a name, an optional link, price, quantity and note, and shows who added it. Tick an item when it's bought; ticked items move to a "Done" group that can be cleared.
- **Selling:** any item can be marked "Selling" instead of "Buying", mainly for Facebook Marketplace and Vinted. A selling item has an asking price and a status of *Listed* or *Sold* instead of a tick.

### Fridge (built; see docs/Features.md)

- Its own section, built around what's in the fridge rather than what to buy.
- An item has a name, quantity, an optional expiry date and a note, and shows who added it.
- Items expiring in the next few days show as "Use soon", and expired ones are flagged.
- **Used up** removes the item, and can add it to a shopping list you pick.

### Later: who owns a fridge item

- An optional owner on a fridge item ("Ana's yogurt"), set when adding or editing.
- A household setting, **off by default**, that the owner or an admin can turn on. While it's off, the fridge shows no names at all.
- The database already records who added each item (`added_by_member_id`); it is not shown anywhere.

### Chores

- Its own section, with chores that repeat (daily, weekly, monthly) or happen once.
- Each chore has an assignee. "Done" records who did it and when, then schedules the next time.
- Grouped as Overdue, Today and Upcoming.
- Later: rotating the assignee between members.

### Not in the first version

- Logging an expense when a shopping item is ticked off
- Live updates; the other person's changes appear after a refresh, as with expenses today

## Not yet prioritized

- **The API sleeps when idle.** Render's free plan stops the API after about 15 idle minutes, and the next visit waits about 20 seconds (measured: 22 s cold, 0.13 s warm). The app shows a "waking up" message after 3 seconds. Fixes if it becomes a problem: Render's paid plan, or a scheduled ping that keeps it awake.
- **No database access rules (RLS policies): decided to skip for now (2026-10-10).** Row level security is on with no policies, so browsers cannot touch the database at all; only the API (with the secret key) can, and it checks every request. Policies would only add a second layer. Revisit if the browser ever needs direct database access, for example for live updates.
