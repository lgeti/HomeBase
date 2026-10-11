import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  countOpenItems,
  groupListItems,
  initialItemForm,
  itemFormToBody,
  linkHost,
  resolveActiveListId,
  toggledStatus,
} from './shopping.js'

const items = [
  { id: 'a', listId: 'groceries', name: 'Milk', kind: 'buy', status: 'open' },
  { id: 'b', listId: 'groceries', name: 'Bread', kind: 'buy', status: 'bought' },
  { id: 'c', listId: 'market', name: 'Sofa', kind: 'sell', status: 'listed' },
  { id: 'd', listId: 'market', name: 'Desk', kind: 'sell', status: 'sold' },
  { id: 'e', listId: 'market', name: 'Lamp', kind: 'buy', status: 'open' },
]

describe('groupListItems', () => {
  it('splits a list into open and done items, keeping their order', () => {
    const { open, done } = groupListItems(items, 'market')
    assert.deepEqual(open.map((item) => item.id), ['c', 'e'])
    assert.deepEqual(done.map((item) => item.id), ['d'])
  })

  it('counts what is still open', () => {
    assert.equal(countOpenItems(items, 'groceries'), 1)
    assert.equal(countOpenItems(items, 'missing'), 0)
  })
})

describe('toggledStatus', () => {
  it('ticks and unticks items to buy', () => {
    assert.equal(toggledStatus(items[0]), 'bought')
    assert.equal(toggledStatus(items[1]), 'open')
  })

  it('marks selling items sold and back to listed', () => {
    assert.equal(toggledStatus(items[2]), 'sold')
    assert.equal(toggledStatus(items[3]), 'listed')
  })
})

describe('resolveActiveListId', () => {
  const lists = [{ id: 'groceries' }, { id: 'market' }]

  it('keeps the chosen list while it exists', () => {
    assert.equal(resolveActiveListId(lists, 'market'), 'market')
  })

  it('falls back to the first list after the chosen one is deleted', () => {
    assert.equal(resolveActiveListId(lists, 'temu'), 'groceries')
    assert.equal(resolveActiveListId([], 'temu'), null)
  })
})

describe('linkHost', () => {
  it('shows just the site', () => {
    assert.equal(linkHost('https://www.facebook.com/marketplace/item/123'), 'facebook.com')
    assert.equal(linkHost('not a link'), 'not a link')
  })
})

describe('item form', () => {
  it('starts a new item on the current list', () => {
    assert.deepEqual(initialItemForm({ listId: 'market' }), {
      listId: 'market', kind: 'buy', name: '', quantity: '', price: '', link: '', note: '',
    })
  })

  it('fills in an existing item and sends it back trimmed', () => {
    const item = { listId: 'market', kind: 'sell', name: 'Sofa ', price: 80, link: ' https://fb.com/1 ', note: undefined }
    const form = initialItemForm({ item, listId: 'groceries' })
    assert.equal(form.listId, 'market')
    assert.equal(form.price, '80')
    assert.deepEqual(itemFormToBody(form), {
      listId: 'market', kind: 'sell', name: 'Sofa', quantity: '', price: 80, link: 'https://fb.com/1', note: '',
    })
  })

  it('sends an empty price so editing can clear it', () => {
    assert.equal(itemFormToBody(initialItemForm({ listId: 'x' })).price, '')
  })
})
