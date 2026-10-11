import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isDone, normalizeItem, normalizeLink, normalizeListName, validateItem, validateListName } from '../src/shopping.js'

describe('list names', () => {
  it('trims and collapses spaces', () => {
    assert.equal(normalizeListName('  Facebook   Marketplace '), 'Facebook Marketplace')
  })

  it('rejects empty and overlong names', () => {
    assert.match(validateListName(normalizeListName('   ')), /Enter a list name/)
    assert.match(validateListName('x'.repeat(41)), /at most 40/)
    assert.equal(validateListName('IKEA'), null)
  })
})

describe('normalizeLink', () => {
  it('adds https:// to a bare address', () => {
    assert.equal(normalizeLink('temu.com/item/1'), 'https://temu.com/item/1')
    assert.equal(normalizeLink('http://example.com'), 'http://example.com')
    assert.equal(normalizeLink('  '), null)
  })
})

describe('normalizeItem', () => {
  it('starts a new item as open to buy', () => {
    const item = normalizeItem({ listId: 'l1', name: ' Milk ', quantity: '2 l' })
    assert.deepEqual(item, {
      list_id: 'l1', name: 'Milk', kind: 'buy', status: 'open', quantity: '2 l', price: null, link: null, note: null,
    })
    assert.equal(validateItem(item), null)
  })

  it('starts a selling item as listed', () => {
    const item = normalizeItem({ listId: 'l1', name: 'Old sofa', kind: 'sell', price: '80' })
    assert.equal(item.status, 'listed')
    assert.equal(item.price, 80)
    assert.equal(validateItem(item), null)
  })

  it('keeps every field the body leaves out when updating', () => {
    const existing = {
      list_id: 'l1', name: 'Lamp', kind: 'buy', status: 'open', quantity: '1', price: '12.5000', link: 'https://ikea.com', note: 'white',
    }
    const item = normalizeItem({ status: 'bought' }, existing)
    assert.deepEqual(item, { ...existing, status: 'bought', price: 12.5 })
  })

  it('restarts the status when switching between buying and selling', () => {
    const existing = { list_id: 'l1', name: 'Bike', kind: 'buy', status: 'bought' }
    assert.equal(normalizeItem({ kind: 'sell' }, existing).status, 'listed')
  })

  it('clears optional fields sent empty', () => {
    const existing = { list_id: 'l1', name: 'Lamp', kind: 'buy', status: 'open', price: '5', link: 'https://a.com', note: 'x' }
    const item = normalizeItem({ price: '', link: '', note: '' }, existing)
    assert.equal(item.price, null)
    assert.equal(item.link, null)
    assert.equal(item.note, null)
  })
})

describe('validateItem', () => {
  const valid = { list_id: 'l1', name: 'Milk', kind: 'buy', status: 'open', quantity: null, price: null, link: null, note: null }

  it('requires a list and a name', () => {
    assert.match(validateItem({ ...valid, list_id: undefined }), /listId/)
    assert.match(validateItem({ ...valid, name: '' }), /Enter what/)
  })

  it('only allows statuses that fit the kind', () => {
    assert.match(validateItem({ ...valid, status: 'sold' }), /open or bought/)
    assert.match(validateItem({ ...valid, kind: 'sell', status: 'bought' }), /listed or sold/)
    assert.match(validateItem({ ...valid, kind: 'gift' }), /buy or sell/)
  })

  it('rejects negative or non-numeric prices', () => {
    assert.match(validateItem({ ...valid, price: -1 }), /zero or more/)
    assert.match(validateItem({ ...valid, price: Number('abc') }), /zero or more/)
    assert.equal(validateItem({ ...valid, price: 0 }), null)
  })

  it('only accepts web links', () => {
    assert.match(validateItem({ ...valid, link: 'javascript:alert(1)' }), /web address/)
    assert.match(validateItem({ ...valid, link: 'https://' }), /web address/)
    assert.equal(validateItem({ ...valid, link: 'https://www.facebook.com/marketplace/item/1' }), null)
  })
})

describe('isDone', () => {
  it('is bought for buying and sold for selling', () => {
    assert.equal(isDone({ kind: 'buy', status: 'bought' }), true)
    assert.equal(isDone({ kind: 'buy', status: 'open' }), false)
    assert.equal(isDone({ kind: 'sell', status: 'sold' }), true)
    assert.equal(isDone({ kind: 'sell', status: 'listed' }), false)
  })
})
