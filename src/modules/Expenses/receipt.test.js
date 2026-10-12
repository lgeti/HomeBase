import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  boughtShoppingItems,
  formWithReceipt,
  fridgeItemsFrom,
  inventoryGroupOf,
  inventoryItemsFrom,
  restockedInventoryItems,
  reviewItems,
  SKIP,
  suggestedGroup,
  toInventory,
} from './receipt.js'

const scanned = [
  { receiptText: 'MLEKO 1L 3.2%', name: 'Milk 1 L', quantity: null, price: 1.19, isFood: true, inventoryGroup: 'Other' },
  { receiptText: 'JAJCA M 10/1', name: 'Eggs', quantity: '10', price: 2.89, isFood: true, inventoryGroup: 'Other' },
  { receiptText: 'WC PAPIR 8/1', name: 'Toilet paper', quantity: '8', price: 3.99, isFood: false, inventoryGroup: 'Bathroom' },
]
const groups = [{ id: 'g-app', name: 'Appliances' }, { id: 'g-bath', name: 'Bathroom' }, { id: 'g-clean', name: 'Cleaning' }]

describe('reviewItems', () => {
  it('sends food to the fridge and leaves the rest out until chosen', () => {
    assert.deepEqual(reviewItems(scanned).map((item) => [item.key, item.destination]), [[0, 'fridge'], [1, 'fridge'], [2, SKIP]])
  })
})

describe('suggestedGroup', () => {
  it("matches the reader's suggestion to the household's group by name", () => {
    assert.equal(suggestedGroup(scanned[2], groups).id, 'g-bath')
    assert.equal(suggestedGroup(scanned[0], groups), null)
  })
})

describe('fridgeItemsFrom and inventoryItemsFrom', () => {
  it('split the lines by where they go', () => {
    const items = reviewItems(scanned)
    items[0].destination = SKIP
    items[2].destination = toInventory('g-bath')
    assert.deepEqual(fridgeItemsFrom(items), [{ name: 'Eggs', quantity: '10' }])
    assert.deepEqual(inventoryItemsFrom(items, '2026-10-11'), [
      { groupId: 'g-bath', name: 'Toilet paper', quantity: '8', price: 3.99, purchasedOn: '2026-10-11' },
    ])
    assert.equal(inventoryGroupOf('fridge'), null)
  })
})

describe('boughtShoppingItems', () => {
  const shopping = [
    { id: 's1', name: 'Milk', kind: 'buy', status: 'open' },
    { id: 's2', name: 'toilet paper', kind: 'buy', status: 'open' },
    { id: 's3', name: 'Bread', kind: 'buy', status: 'open' },
    { id: 's4', name: 'Milk', kind: 'buy', status: 'bought' },
    { id: 's5', name: 'Old milk jug', kind: 'sell', status: 'listed' },
  ]

  it('finds open items to buy that match anything on the receipt', () => {
    assert.deepEqual(boughtShoppingItems(reviewItems(scanned), shopping).map((item) => item.id), ['s1', 's2'])
  })
})

describe('restockedInventoryItems', () => {
  it('finds running-low inventory items that the receipt bought', () => {
    const inventory = [
      { id: 'i1', name: 'Toilet paper', isRunningLow: true },
      { id: 'i2', name: 'Toilet cleaner', isRunningLow: false },
      { id: 'i3', name: 'Dish soap', isRunningLow: true },
    ]
    assert.deepEqual(restockedInventoryItems(reviewItems(scanned), inventory).map((item) => item.id), ['i1'])
  })
})

describe('formWithReceipt', () => {
  const form = { amount: '', categoryId: 'car', tag: 'Fuel', description: '', date: '2026-10-12', paidByMemberId: 'm1' }

  it('fills in what the receipt says', () => {
    assert.deepEqual(formWithReceipt(form, { total: 10.56, date: '2026-10-11', shop: 'Mercator', categoryId: 'groceries' }), {
      ...form, amount: '10.56', date: '2026-10-11', description: 'Mercator', categoryId: 'groceries', tag: '',
    })
  })

  it('keeps the form where the receipt was unreadable', () => {
    assert.deepEqual(formWithReceipt(form, { total: null, date: null, shop: null, categoryId: 'car' }), form)
  })
})
