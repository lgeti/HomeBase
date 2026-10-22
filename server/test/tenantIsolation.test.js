// Guards that keep one household from reaching another's data, checked across every route and migration
// so a new route or table cannot quietly skip them.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

// The routers create the Supabase client on import; nothing here talks to it
process.env.SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SECRET_KEY ||= 'test-only'

const routesDir = new URL('../src/routes/', import.meta.url)
const dbDir = new URL('../db/', import.meta.url)

const loadRoutes = async () => {
  const routes = []
  for (const file of readdirSync(routesDir).filter((name) => name.endsWith('.js'))) {
    const { default: router } = await import(new URL(file, routesDir))
    for (const layer of router.stack) {
      if (!layer.route) continue
      const paths = [layer.route.path].flat()
      const middleware = layer.route.stack.map((step) => step.handle.name)
      for (const path of paths) routes.push({ file, path, middleware })
    }
  }
  return routes
}

describe('household routes', () => {
  it('every route under a household checks sign-in, then membership', async () => {
    const routes = (await loadRoutes()).filter(({ path }) => path.includes(':householdId'))
    assert.ok(routes.length > 30, 'expected to find the household routes')

    for (const { file, path, middleware } of routes) {
      const auth = middleware.indexOf('requireAuth')
      const member = middleware.indexOf('requireHouseholdMember')
      assert.ok(auth >= 0 && member > auth, `${file} ${path} must use requireAuth then requireHouseholdMember`)
    }
  })
})

describe('database tables', () => {
  const migrations = readdirSync(dbDir)
    .filter((name) => /^\d{3}_.*\.sql$/.test(name) && !name.startsWith('999'))
    .map((name) => readFileSync(new URL(name, dbDir), 'utf8').toLowerCase())
    .join('\n')

  it('every table has row level security on', () => {
    const tables = [...migrations.matchAll(/create table (?:if not exists )?public\.(\w+)/g)].map((match) => match[1])
    assert.ok(tables.length > 10, 'expected to find the tables')

    for (const table of tables) {
      assert.match(migrations, new RegExp(`alter table public\\.${table} enable row level security`), `${table} needs RLS on`)
    }
  })

  it('no app table is opened to browsers with a policy', () => {
    // Browsers only use Supabase for sign-in; all data goes through the API, which checks membership itself
    assert.doesNotMatch(migrations, /create policy[^;]*\son public\./)
  })
})
