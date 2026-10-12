import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { changeFromRequest, cleanClientId, householdTopic } from '../src/realtime.js'

const household = '0b6a2c1e-3f4d-4a5b-8c7d-9e0f1a2b3c4d'
const path = (rest) => `/api/households/${household}/${rest}`

describe('changeFromRequest', () => {
  it('names the section a change touches', () => {
    assert.deepEqual(changeFromRequest('POST', path('expenses')), { householdId: household, sections: ['expenses'] })
    assert.deepEqual(changeFromRequest('PATCH', path('shopping-items/abc')), { householdId: household, sections: ['shopping'] })
    assert.deepEqual(changeFromRequest('POST', path('shopping-lists/abc/clear-done')).sections, ['shopping'])
    assert.deepEqual(changeFromRequest('POST', path('shopping-lists/abc/import')).sections, ['shopping'])
    assert.deepEqual(changeFromRequest('DELETE', path('fridge-items/abc')).sections, ['fridge'])
    assert.deepEqual(changeFromRequest('POST', path('fridge-items/abc/used-up')).sections, ['fridge', 'shopping'])
    assert.deepEqual(changeFromRequest('POST', path('chores/abc/done')).sections, ['chores'])
    assert.deepEqual(changeFromRequest('POST', path('recipes/abc/cooked')).sections, ['recipes'])
    assert.deepEqual(changeFromRequest('PATCH', path('inventory-groups/abc')).sections, ['inventory'])
    assert.deepEqual(changeFromRequest('DELETE', path('members/abc')).sections, ['household'])
  })

  it('ignores reads and requests that change nothing', () => {
    assert.equal(changeFromRequest('GET', path('expenses')), null)
    assert.equal(changeFromRequest('POST', path('shopping-lists/abc/import-preview')), null)
    assert.equal(changeFromRequest('POST', path('recipe-suggestions')), null)
    assert.equal(changeFromRequest('POST', path('receipt-scan')), null)
    assert.equal(changeFromRequest('POST', '/api/invitations/token/accept'), null)
    assert.equal(changeFromRequest('POST', '/api/households/not-a-uuid/expenses'), null)
  })
})

describe('cleanClientId', () => {
  it('accepts a random id and nothing else', () => {
    assert.equal(cleanClientId('3f2b8c1a-1111-4e2a-9d3c-5b6a7c8d9e0f'), '3f2b8c1a-1111-4e2a-9d3c-5b6a7c8d9e0f')
    assert.equal(cleanClientId('short'), null)
    assert.equal(cleanClientId('<script>alert(1)</script>'), null)
    assert.equal(cleanClientId(undefined), null)
  })
})

describe('householdTopic', () => {
  it('is the private channel name the access rule expects', () => {
    assert.equal(householdTopic(household), `household:${household}`)
  })
})
