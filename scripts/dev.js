// Starts the API and the web app together for local development.
// The API reads server/.env.development.local (the homebase-dev Supabase project), never server/.env (production).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const serverEnvFile = 'server/.env.development.local'

if (!existsSync(serverEnvFile) || !existsSync('.env.development.local')) {
  console.error('Missing .env.development.local or server/.env.development.local (both point at the homebase-dev Supabase project)')
  process.exit(1)
}

const run = (name, command, env = process.env) => {
  const child = spawn(command, { stdio: 'inherit', shell: true, env })
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`)
    process.exit(code ?? 0)
  })
  return child
}

// Drop any inherited PORT so the API uses the PORT from its own env file instead of the web app's
const { PORT, ...apiEnv } = process.env

run('api', 'npm start --prefix server', { ...apiEnv, DOTENV_CONFIG_PATH: '.env.development.local' })
run('web', 'npm run dev')
