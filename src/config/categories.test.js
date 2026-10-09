import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { CATEGORIES } from './categories.js'

// Category ids seeded in the database. Expenses can only use these (foreign key), so the app must offer exactly these.
const schema = readFileSync(new URL('../../server/db/001_initial_schema.sql', import.meta.url), 'utf8')
const seedBlock = schema.slice(schema.indexOf('insert into public.categories'), schema.indexOf('on conflict (category_id)'))
const databaseIds = [...seedBlock.matchAll(/\('([a-z-]+)',/g)].map((match) => match[1])

describe('categories', () => {
  it('finds the database seed', () => {
    assert.ok(databaseIds.length > 0)
  })

  it('offers exactly the category ids the database accepts', () => {
    assert.deepEqual(CATEGORIES.map((category) => category.id).sort(), [...databaseIds].sort())
  })

  it('has no duplicate ids or names', () => {
    assert.equal(new Set(CATEGORIES.map((category) => category.id)).size, CATEGORIES.length)
    assert.equal(new Set(CATEGORIES.map((category) => category.name)).size, CATEGORIES.length)
  })
})
