import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MAX_FILE_BYTES, parseReceipt, validateReceiptFile } from '../src/receipts.js'

const today = '2026-10-12'
const answer = {
  isReceipt: true,
  shop: '  Mercator ',
  date: '2026-10-11',
  total: 10.564,
  category: 'groceries',
  items: [
    { receiptText: 'MLEKO 1L 3.2%', name: 'Milk 1 L', quantity: '', price: 1.19, isFood: true, foodStorage: 'fridge' },
    { receiptText: 'JAJCA M 10/1', name: 'Eggs', quantity: '10', price: 2.89, isFood: true, foodStorage: 'pantry' },
    { receiptText: 'WC PAPIR 8/1', name: 'Toilet paper', quantity: '8', price: 3.99, isFood: false, inventoryGroup: 'Bathroom' },
    { receiptText: 'SIR GAUDA', name: '', quantity: '0.25 kg', price: -1, isFood: 'yes' },
    { receiptText: '', name: '', quantity: '', price: 0, isFood: false },
  ],
}

describe('parseReceipt', () => {
  it('cleans the shop, date, total, category and items', () => {
    assert.deepEqual(parseReceipt(answer, today), {
      shop: 'Mercator',
      date: '2026-10-11',
      total: 10.56,
      categoryId: 'groceries',
      items: [
        { receiptText: 'MLEKO 1L 3.2%', name: 'Milk 1 L', quantity: null, price: 1.19, isFood: true, inventoryGroup: 'Other', foodStorage: 'fridge' },
        { receiptText: 'JAJCA M 10/1', name: 'Eggs', quantity: '10', price: 2.89, isFood: true, inventoryGroup: 'Other', foodStorage: 'pantry' },
        { receiptText: 'WC PAPIR 8/1', name: 'Toilet paper', quantity: '8', price: 3.99, isFood: false, inventoryGroup: 'Bathroom', foodStorage: 'fridge' },
        { receiptText: 'SIR GAUDA', name: 'SIR GAUDA', quantity: '0.25 kg', price: null, isFood: false, inventoryGroup: 'Other', foodStorage: 'fridge' },
      ],
    })
  })

  it('drops dates that are unreadable, in the future or over a year old', () => {
    assert.equal(parseReceipt({ ...answer, date: '' }, today).date, null)
    assert.equal(parseReceipt({ ...answer, date: '2026-10-13' }, today).date, null)
    assert.equal(parseReceipt({ ...answer, date: '2024-01-01' }, today).date, null)
    assert.equal(parseReceipt({ ...answer, date: '2026-02-30' }, today).date, null)
  })

  it('falls back to groceries and an unknown total', () => {
    const receipt = parseReceipt({ ...answer, category: 'food', total: 0 }, today)
    assert.equal(receipt.categoryId, 'groceries')
    assert.equal(receipt.total, null)
  })

  it('gives nothing back when the photo is not a receipt or nothing could be read', () => {
    assert.equal(parseReceipt({ ...answer, isReceipt: false }, today), null)
    assert.equal(parseReceipt({ ...answer, total: 0, items: [] }, today), null)
    assert.equal(parseReceipt(null, today), null)
  })
})

describe('validateReceiptFile', () => {
  it('accepts a small JPEG or PDF', () => {
    assert.equal(validateReceiptFile({ mimeType: 'image/jpeg', data: 'aGVsbG8=' }), null)
    assert.equal(validateReceiptFile({ mimeType: 'application/pdf', data: 'JVBERi0xLjQ=' }), null)
  })

  it('rejects missing, wrong-type, broken and oversized files', () => {
    assert.match(validateReceiptFile(null), /Add a photo or PDF/)
    assert.match(validateReceiptFile({ mimeType: 'text/html', data: 'aGVsbG8=' }), /photo .* or a PDF/)
    assert.match(validateReceiptFile({ mimeType: 'image/png', data: 'not base64!' }), /could not be read/)
    assert.match(validateReceiptFile({ mimeType: 'application/pdf', data: 'A'.repeat(Math.ceil((MAX_FILE_BYTES + 10) * 4 / 3)) }), /too large/)
  })
})
