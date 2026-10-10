# HomeBase Backlog

Known issues and planned work. **Priority levels:** a higher number means more urgent. Level 0 is the lowest.

## Prioritized

| Level | Item | Details |
| --- | --- | --- |
| 1 | Make the split math consistent | See below |

### Make the split math consistent (level 1)

Split expenses are counted three different ways:

- `getEffectiveAmount` in `src/core/utils/calculations.js` counts a split expense as **half**, which assumes a fixed 50/50 split between two people.
- `getMonthTotal` uses that half amount, so the **"This Month Total"** shows €50 for a €100 split expense. That understates what the household actually spent.
- The category tabs in `CategoryView.jsx` use `getCategoryTotal`, which counts the **full** amount. As a result, the "All" total and the per-category totals disagree.
- `getMemberSummary` splits by the **number of members**, not 50/50. This disagrees with the other two once a household has more than two people.

**Fix:** decide on one rule, probably that totals always show the full amount and splits only affect who-owes-whom. Then use it everywhere and add unit tests for `calculations.js`.

## Not yet prioritized

- **The API sleeps when idle.** Render's free plan stops the API after about 15 idle minutes, and the next visit waits about 20 seconds (measured: 22 s cold, 0.13 s warm). The app shows a "waking up" message after 3 seconds. Fixes if it becomes a problem: Render's paid plan, or a scheduled ping that keeps it awake.
- **No password reset.** There's no "forgot password" screen, so someone who signs up with email and forgets their password is stuck. Carried over from the v2 plan.
- **Removing members has no screen.** The API supports it with role checks, but the Household screen has no button. Carried over from the v2 plan.
- **Pending members count in splits and the payer list.** People who were added or invited but never joined show up as payers and share split expenses. Related to the split math item.
- **No database access rules (RLS policies).** Row level security is on with no policies, so only the API can read data, and the API is the only security boundary. Policies would add a second layer. Carried over from the v2/v3 plans.
- **The API accepts requests from any website** (`cors({ origin: true })`). Requests still need a valid sign-in token, but it could be limited to the GitHub Pages site and localhost.
