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
- **`App.jsx` does too much,** and `server/src/server.js` is one large file. Split them before adding bank sync.
- **Stale docs.** `FEATURE_STATUS.md` still says there's no backend or auth, and `docs/` has several superseded implementation plans.
