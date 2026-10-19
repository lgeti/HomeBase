// Runs after `npm run build` (as "postbuild"). GitHub Pages has no fallback to index.html, so the address
// Supabase Auth opens when an app like Claude asks to connect (<app>/oauth/consent) gets its own copy of the app.
// GitHub Pages serves oauth/consent.html for /oauth/consent; the app then reads ?authorization_id itself.
import { copyFileSync, mkdirSync } from 'node:fs'

mkdirSync('dist/oauth', { recursive: true })
copyFileSync('dist/index.html', 'dist/oauth/consent.html')
