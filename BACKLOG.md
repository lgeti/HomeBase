# HomeBase Backlog

Known issues and planned work. **Priority levels:** a higher number means more urgent. Level 0 is the lowest.

## Prioritized

| Level | Item | Details |
| --- | --- | --- |
| – | Nothing prioritized right now | |

## Not yet prioritized

- **The API sleeps when idle.** Render's free plan stops the API after about 15 idle minutes, and the next visit waits about 20 seconds (measured: 22 s cold, 0.13 s warm). The app shows a "waking up" message after 3 seconds. Fixes if it becomes a problem: Render's paid plan, or a scheduled ping that keeps it awake.
- **No database access rules (RLS policies): decided to skip for now (2026-10-10).** Row level security is on with no policies, so browsers cannot touch the database at all; only the API (with the secret key) can, and it checks every request. Policies would only add a second layer. Revisit if the browser ever needs direct database access, for example for live updates.
