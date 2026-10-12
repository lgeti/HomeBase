import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_GROUPS, normalizeInventoryItem, validateInventoryItem } from '../src/inventory.js'

describe('DEFAULT_GROUPS', () => {
  it('starts with appliances, bathroom and cleaning', () => {
    assert.deepEqual(DEFAULT_GROUPS, ['Appliances', 'Bathroom', 'Cleaning'])
  })
})

describe('normalizeInventoryItem', () => {
  it('builds a new item, leaving empty fields out', () => {
    assert.deepEqual(normalizeInventoryItem({ groupId: 'g1', name: ' Washing machine ', price: '499', purchasedOn: '2026-10-10', warrantyUntil: '2028-10-10', quantity: '' }), {
      group_id: 'g1', name: 'Washing machine', quantity: null, note: null, purchased_on: '2026-10-10', price: 499, warranty_until: '2028-10-10', is_running_low: false,
    })
  })

  it('keeps fields the body leaves out, so a flag can be set alone', () => {
    const existing = { group_id: 'g2', name: 'Toilet paper', quantity: '8', note: null, purchased_on: null, price: '3.9900', warranty_until: null, is_running_low: false }
    assert.deepEqual(normalizeInventoryItem({ isRunningLow: true }, existing), { ...existing, price: 3.99, is_running_low: true })
  })
})

describe('validateInventoryItem', () => {
  const valid = { group_id: 'g1', name: 'Kettle', quantity: null, note: null, purchased_on: null, price: null, warranty_until: null, is_running_low: false }

  it('requires a group and a name', () => {
    assert.equal(validateInventoryItem(valid), null)
    assert.match(validateInventoryItem({ ...valid, group_id: undefined }), /groupId/)
    assert.match(validateInventoryItem({ ...valid, name: '' }), /Enter what/)
  })

  it('checks prices and dates', () => {
    assert.match(validateInventoryItem({ ...valid, price: -1 }), /zero or more/)
    assert.match(validateInventoryItem({ ...valid, purchased_on: '2026-02-30' }), /Purchase date/)
    assert.match(validateInventoryItem({ ...valid, warranty_until: 'soon' }), /Warranty date/)
    assert.match(validateInventoryItem({ ...valid, purchased_on: '2026-10-10', warranty_until: '2026-01-01' }), /cannot end before/)
    assert.equal(validateInventoryItem({ ...valid, purchased_on: '2026-10-10', warranty_until: '2028-10-10', price: 0 }), null)
  })
})
