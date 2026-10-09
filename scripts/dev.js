// Starts the API and the web app together for local development.
// The API reads server/.env.development.local (the homebase-dev Supabase project), never server/.env (production).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const serverEnvFile = 'server/.env.development.local'

if (!existsSync(serverEnvFile) || !existsSync('.env.development.local')) {
  console.error('Missing .env.development.local or server/.env.development.local (both point at the homebase-dev Supabase project)')
  process.exit(1)
}

const run = (name, args, options = {}) => {
  const child = spawn('npm', args, { stdio: 'inherit', shell: true, ...options })
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`)
    process.exit(code ?? 0)
  })
  return child
}

run('api', ['start', '--prefix', 'server'], {
  env: { ...process.env, DOTENV_CONFIG_PATH: '.env.development.local' },
})
run('web', ['run', 'dev'])
