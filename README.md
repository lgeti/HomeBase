# HomeBase

A shared expense tracker for a household: log who paid for what, see monthly totals by category, and know who owes whom.

- **Live app:** https://lgeti.github.io/HomeBase/
- **Features:** [docs/Features.md](docs/Features.md)
- **Planned work and known issues:** [BACKLOG.md](BACKLOG.md)
- **Product direction:** [DIRECTION.md](DIRECTION.md)

## How it fits together

| Part | Where it runs | Code |
| --- | --- | --- |
| Web app (React, Vite, Tailwind) | GitHub Pages | `src/` |
| API (Express) | Render | `server/src/` |
| Sign-in and database | Supabase | `server/db/` (SQL migrations) |

The API uses Supabase's secret key and checks every request itself; the browser never talks to the database directly.

## Local development

You need **Node.js 22 or newer**. Local development uses a separate Supabase project (`homebase-dev`), so production data is never touched.

1. Install dependencies:
   ```bash
   npm install
   npm install --prefix server
   ```
2. Create two config files (both are gitignored):
   - `.env.development.local`
     ```
     VITE_API_BASE_URL=http://localhost:3000
     VITE_SUPABASE_URL=<homebase-dev project URL>
     VITE_SUPABASE_PUBLISHABLE_KEY=<homebase-dev publishable key>
     VITE_AUTH_REDIRECT_URL=http://localhost:5173/HomeBase/
     VITE_GOOGLE_CLIENT_ID=<optional: Google OAuth client ID, for the "Continue with Google" button>
     ```
     The Google client needs `http://localhost` and `http://localhost:5173` under **Authorized JavaScript origins** in Google Cloud, and the same client ID under **Client IDs** in the Supabase project's Google provider. Without it, the button falls back to Supabase's redirect sign-in.
   - `server/.env.development.local`
     ```
     PORT=3000
     SUPABASE_URL=<homebase-dev project URL>
     SUPABASE_SECRET_KEY=<homebase-dev secret key>
     GEMINI_API_KEY=<optional: Google AI Studio key, for recipe suggestions and receipt scanning>
     ```
3. Start the API and the web app together:
   ```bash
   npm run dev:all
   ```
4. Open http://localhost:5173/HomeBase/ and sign up with email and password.

`server/.env` and `.env` hold the production settings and are not used by `npm run dev:all`.

## Tests

```bash
npm test                  # web app (calculations, dates, forms, shopping, fridge, recipe ranking and chore dates)
npm test --prefix server  # API (permissions, recurring dates, shopping, fridge, recipe, chore and link-import rules)
```

CI runs both, plus a production build, on every pull request.

## Database changes

Migrations live in `server/db/` and are numbered. Run each new one in the Supabase SQL Editor, first on `homebase-dev`, then on production **before** merging the code that needs it. `999_reset_application_data.sql` deletes all app data and is for development only.

## Deploying

- **API:** Render deploys automatically when a pull request is merged into `main`.
- **Web app:** from `main`, run `npm run deploy`. It builds with the production settings in `.env` and publishes to GitHub Pages.
  It first checks that this folder is on `main`, has no uncommitted changes and matches GitHub exactly (`scripts/check-deploy.js`), and stops with what to do if not. After merging a PR, pull before deploying.
