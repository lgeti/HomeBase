# SaaS setup: what's left to set up (2026-10-22)

The plans and limits are built (PR #63: Free = 2 members and 10 AI calls a month; Pro = no member limit, 200 AI calls a month, use from Claude). The landing page and onboarding are built too (PRs #62 and #64). This is what's still needed to charge for Pro and run HomeBase as a public service.

## 1. Stripe (accounts first, then code)

- [ ] Create a Stripe account and turn on test mode
- [ ] Create a **Pro** product with a monthly price, and note its **price ID**
- [ ] Put the test **secret key** and, later, the **webhook signing secret** in the server environment (Render, and `server/.env.development.local` for dev)
- [ ] Code, in a new PR:
  - a checkout endpoint that starts Stripe Checkout for a household
  - a webhook that sets `households.plan`, `plan_status`, `current_period_end`, `stripe_customer_id` and `stripe_subscription_id` (the columns already exist from `014_plans.sql`)
  - a **Manage billing** button that opens Stripe's customer portal
  - an **Upgrade** button on the upgrade prompt and in Household → Plan & usage
- [ ] Set the real Pro price in `src/config/plans.js`, and remove "Coming soon"

## 2. Hosting off the free tiers

- [ ] **Render:** move the API to a paid plan (Starter). The free plan sleeps, so the first load can take up to a minute
- [ ] **Supabase:** move prod to Pro, for backups and no pausing
- [ ] **GitHub Pages** can stay for the web app

## 3. Domain and email

- [ ] Buy a domain and point the web app at it
- [ ] Add the domain to Google OAuth's authorized JavaScript origins and redirect URIs
- [ ] Add the domain to the API's `CORS_ORIGINS` and to Supabase Auth's site URL and redirect URLs
- [ ] Set up an email sender for Supabase Auth (e.g. Resend or Postmark). The built-in sender is heavily rate-limited

## 4. AI (Gemini)

- [ ] Turn on billing for the Gemini API key. On the free tier:
  - all households share one rate limit
  - Google may use requests to train its models, which isn't acceptable for paying users
- [ ] Set a monthly spending cap in Google Cloud
- Cost: receipt scans and recipe ideas use Flash-Lite, a fraction of a cent per call. Even a Pro household that uses all 200 calls costs well under €0.50 a month
- Using HomeBase from Claude (MCP) costs nothing in AI, because the person's own Claude does the thinking. It's Pro-only for value, not cost

## 5. Legal

- [ ] Privacy policy (expenses, receipt photos, household members' names; GDPR)
- [ ] Terms of service, including billing, refunds and cancelling
- [ ] Links to both from the landing page footer and the sign-up page

## 6. Before deploying the plans work to prod

- [ ] Apply `014_plans.sql` to prod **before** deploying the server version that uses it
- [ ] Set your own household to Pro first, or using HomeBase from Claude stops working:
  `update households set plan = 'pro' where household_id = '…';`
