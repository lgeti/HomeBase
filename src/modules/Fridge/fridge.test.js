import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { addDays, daysUntil, expiryLabel, freshness, fridgeFormToBody, groupFridgeItems, initialFridgeForm, itemsIn } from './fridge.js'

const today = '2026-10-11'
const item = (id, expiresOn) => ({ id, name: id, expiresOn })

describe('daysUntil', () => {
  it('counts whole days, across months and a DST change', () => {
    assert.equal(daysUntil('2026-10-11', today), 0)
    assert.equal(daysUntil('2026-11-02', today), 22)
    assert.equal(daysUntil('2026-10-09', today), -2)
  })
})

describe('freshness', () => {
  it('flags expired, soon and fine items', () => {
    assert.equal(freshness(item('a', '2026-10-10'), today), 'expired')
    assert.equal(freshness(item('b', '2026-10-11'), today), 'soon')
    assert.equal(freshness(item('c', '2026-10-14'), today), 'soon')
    assert.equal(freshness(item('d', '2026-10-15'), today), 'ok')
    assert.equal(freshness(item('e', undefined), today), 'none')
  })
})

describe('expiryLabel', () => {
  it('speaks in days when it is close', () => {
    assert.equal(expiryLabel(item('a', '2026-10-08'), today), 'Expired 3 days ago')
    assert.equal(expiryLabel(item('a', '2026-10-10'), today), 'Expired yesterday')
    assert.equal(expiryLabel(item('a', '2026-10-11'), today), 'Expires today')
    assert.equal(expiryLabel(item('a', '2026-10-12'), today), 'Expires tomorrow')
    assert.equal(expiryLabel(item('a', '2026-10-14'), today), 'Expires in 3 days')
  })

  it('shows the date when it is further away', () => {
    assert.equal(expiryLabel(item('a', '2026-10-20'), today), 'Expires 20 Oct')
    assert.equal(expiryLabel(item('a', '2027-01-05'), today), 'Expires 5 Jan 2027')
    assert.equal(expiryLabel(item('a', undefined), today), null)
  })
})

describe('groupFridgeItems', () => {
  it('puts urgent items first, then dated, then undated', () => {
    const items = [item('none', undefined), item('later', '2026-11-01'), item('soon', '2026-10-13'), item('expired', '2026-10-01'), item('next', '2026-10-20')]
    const { useSoon, rest } = groupFridgeItems(items, today)
    assert.deepEqual(useSoon.map((i) => i.id), ['expired', 'soon'])
    assert.deepEqual(rest.map((i) => i.id), ['next', 'later', 'none'])
  })
})

describe('fridge form', () => {
  it('round-trips an item and sends cleared fields empty', () => {
    const form = initialFridgeForm({ name: 'Milk ', quantity: '1 l', expiresOn: '2026-10-14', note: undefined, location: 'fridge' })
    assert.deepEqual(fridgeFormToBody(form), { location: 'fridge', name: 'Milk', quantity: '1 l', expiresOn: '2026-10-14', note: '' })
    assert.deepEqual(fridgeFormToBody(initialFridgeForm()), { location: 'fridge', name: '', quantity: '', expiresOn: '', note: '' })
  })

  it('starts a new item where you are, and keeps an existing one where it is', () => {
    assert.equal(initialFridgeForm(undefined, 'pantry').location, 'pantry')
    assert.equal(initialFridgeForm({ name: 'Rice', location: 'pantry' }, 'fridge').location, 'pantry')
  })
})

describe('addDays', () => {
  it('moves across month and year ends', () => {
    assert.equal(addDays('2026-10-11', 3), '2026-10-14')
    assert.equal(addDays('2026-10-30', 7), '2026-11-06')
    assert.equal(addDays('2026-12-30', 3), '2027-01-02')
  })
})

describe('itemsIn', () => {
  it('splits food by where it is kept; older items without a place are in the fridge', () => {
    const items = [{ id: 'a', location: 'fridge' }, { id: 'b', location: 'pantry' }, { id: 'c' }]
    assert.deepEqual(itemsIn(items, 'fridge').map((item) => item.id), ['a', 'c'])
    assert.deepEqual(itemsIn(items, 'pantry').map((item) => item.id), ['b'])
  })
})
