import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { boughtShoppingItems, formWithReceipt, fridgeItemsFrom, reviewItems } from './receipt.js'

const scanned = [
  { receiptText: 'MLEKO 1L 3.2%', name: 'Milk 1 L', quantity: null, price: 1.19, isFood: true },
  { receiptText: 'JAJCA M 10/1', name: 'Eggs', quantity: '10', price: 2.89, isFood: true },
  { receiptText: 'WC PAPIR 8/1', name: 'Toilet paper', quantity: '8', price: 3.99, isFood: false },
]

describe('reviewItems', () => {
  it('ticks food for the fridge and leaves the rest', () => {
    assert.deepEqual(reviewItems(scanned).map((item) => [item.key, item.toFridge]), [[0, true], [1, true], [2, false]])
  })
})

describe('fridgeItemsFrom', () => {
  it('makes fridge items from the ticked lines', () => {
    const items = reviewItems(scanned)
    items[0].toFridge = false
    assert.deepEqual(fridgeItemsFrom(items), [{ name: 'Eggs', quantity: '10' }])
  })
})

describe('boughtShoppingItems', () => {
  const shopping = [
    { id: 's1', name: 'Milk', kind: 'buy', status: 'open' },
    { id: 's2', name: 'eggs (free range)', kind: 'buy', status: 'open' },
    { id: 's3', name: 'Bread', kind: 'buy', status: 'open' },
    { id: 's4', name: 'Milk', kind: 'buy', status: 'bought' },
    { id: 's5', name: 'Old milk jug', kind: 'sell', status: 'listed' },
  ]

  it('finds open items to buy that match what went to the fridge', () => {
    assert.deepEqual(boughtShoppingItems(reviewItems(scanned), shopping).map((item) => item.id), ['s1', 's2'])
  })

  it('ignores lines that are not going to the fridge', () => {
    const items = reviewItems(scanned).map((item) => ({ ...item, toFridge: false }))
    assert.deepEqual(boughtShoppingItems(items, shopping), [])
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
