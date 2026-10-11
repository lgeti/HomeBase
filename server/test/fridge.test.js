import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeFridgeItem, validateFridgeItem } from '../src/fridge.js'

describe('normalizeFridgeItem', () => {
  it('trims a new item and leaves empty fields out', () => {
    assert.deepEqual(normalizeFridgeItem({ name: ' Milk ', quantity: ' 1 l ', expiresOn: '2026-10-14', note: '' }), {
      name: 'Milk', quantity: '1 l', expires_on: '2026-10-14', note: null,
    })
  })

  it('keeps every field the body leaves out when updating', () => {
    const existing = { name: 'Eggs', quantity: '6', expires_on: '2026-10-20', note: 'free range' }
    assert.deepEqual(normalizeFridgeItem({ quantity: '4' }, existing), { ...existing, quantity: '4' })
  })

  it('clears the expiry date when it is sent empty', () => {
    const existing = { name: 'Butter', quantity: null, expires_on: '2026-10-20', note: null }
    assert.equal(normalizeFridgeItem({ expiresOn: '' }, existing).expires_on, null)
  })
})

describe('validateFridgeItem', () => {
  const valid = { name: 'Milk', quantity: null, expires_on: null, note: null }

  it('requires a name', () => {
    assert.match(validateFridgeItem({ ...valid, name: '' }), /Enter what/)
    assert.equal(validateFridgeItem(valid), null)
  })

  it('only accepts real dates', () => {
    assert.equal(validateFridgeItem({ ...valid, expires_on: '2028-02-29' }), null)
    assert.match(validateFridgeItem({ ...valid, expires_on: '2026-02-30' }), /real date/)
    assert.match(validateFridgeItem({ ...valid, expires_on: '14/10/2026' }), /real date/)
  })

  it('limits field lengths', () => {
    assert.match(validateFridgeItem({ ...valid, name: 'x'.repeat(121) }), /120/)
    assert.match(validateFridgeItem({ ...valid, quantity: 'x'.repeat(31) }), /30/)
    assert.match(validateFridgeItem({ ...valid, note: 'x'.repeat(501) }), /500/)
  })
})
