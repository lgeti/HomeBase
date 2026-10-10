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
     ```
   - `server/.env.development.local`
     ```
     PORT=3000
     SUPABASE_URL=<homebase-dev project URL>
     SUPABASE_SECRET_KEY=<homebase-dev secret key>
     ```
3. Start the API and the web app together:
   ```bash
   npm run dev:all
   ```
4. Open http://localhost:5173/HomeBase/ and sign up with email and password.

`server/.env` and `.env` hold the production settings and are not used by `npm run dev:all`.

## Tests

```bash
npm test                  # web app (calculations, dates, categories)
npm test --prefix server  # API (permissions, recurring dates)
```

CI runs both, plus a production build, on every pull request.

## Database changes

Migrations live in `server/db/` and are numbered. Run each new one in the Supabase SQL Editor, first on `homebase-dev`, then on production **before** merging the code that needs it. `999_reset_application_data.sql` deletes all app data and is for development only.

## Deploying

- **API:** Render deploys automatically when a pull request is merged into `main`.
- **Web app:** from `main`, run `npm run deploy`. It builds with the production settings in `.env` and publishes to GitHub Pages.
