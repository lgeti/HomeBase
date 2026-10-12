import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countRunningLow, groupItems, initialInventoryForm, inventoryFormToBody, warrantyEnd, warrantyStatus } from './inventory.js'

const today = '2026-10-12'

describe('groupItems', () => {
  it('lists a group with running-low items first, then by name', () => {
    const items = [
      { id: 'a', groupId: 'bath', name: 'Toothpaste', isRunningLow: false },
      { id: 'b', groupId: 'bath', name: 'Toilet paper', isRunningLow: true },
      { id: 'c', groupId: 'bath', name: 'Shampoo', isRunningLow: false },
      { id: 'd', groupId: 'clean', name: 'Sponges', isRunningLow: true },
    ]
    assert.deepEqual(groupItems(items, 'bath').map((item) => item.id), ['b', 'c', 'a'])
    assert.equal(countRunningLow(items, 'bath'), 1)
  })
})

describe('warrantyStatus', () => {
  it('describes how long a warranty has left', () => {
    assert.equal(warrantyStatus({}, today), null)
    assert.deepEqual(warrantyStatus({ warrantyUntil: '2028-03-12' }, today), { text: 'Warranty until 12 Mar 2028', state: 'ok' })
    assert.deepEqual(warrantyStatus({ warrantyUntil: '2026-11-01' }, today), { text: 'Warranty ends in 20 days', state: 'soon' })
    assert.deepEqual(warrantyStatus({ warrantyUntil: '2026-10-12' }, today), { text: 'Warranty ends today', state: 'soon' })
    assert.deepEqual(warrantyStatus({ warrantyUntil: '2026-10-05' }, today), { text: 'Warranty ended 5 Oct', state: 'ended' })
  })
})

describe('warrantyEnd', () => {
  it('adds whole years, keeping leap days valid', () => {
    assert.equal(warrantyEnd('2026-10-10', 2), '2028-10-10')
    assert.equal(warrantyEnd('2028-02-29', 1), '2029-02-28')
  })
})

describe('inventory form', () => {
  it('starts a new item in the current group and round-trips an existing one', () => {
    assert.equal(initialInventoryForm({ groupId: 'g1' }).groupId, 'g1')
    const item = { groupId: 'g2', name: 'Kettle ', price: 39.99, purchasedOn: '2026-10-10', warrantyUntil: '2028-10-10' }
    assert.deepEqual(inventoryFormToBody(initialInventoryForm({ item, groupId: 'g1' })), {
      groupId: 'g2', name: 'Kettle', quantity: '', price: 39.99, purchasedOn: '2026-10-10', warrantyUntil: '2028-10-10', note: '',
    })
  })
})
