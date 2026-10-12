// Reading a receipt from a photo or a PDF (digital receipts). Pure functions so they can be tested without the AI.
import { isRealDate } from './chores.js'
import { daysBetween } from './recipeSuggestions.js'

// The expense categories (the same ids as the categories table)
export const CATEGORY_IDS = ['car', 'subscriptions', 'groceries', 'entertainment', 'going-out', 'utilities', 'home', 'other']

export const RECEIPT_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_ITEMS = 100

// What the model must answer with; unknown values come back empty or 0
export const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    isReceipt: { type: 'boolean' },
    shop: { type: 'string' },
    date: { type: 'string' },
    total: { type: 'number' },
    category: { type: 'string', enum: CATEGORY_IDS },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          receiptText: { type: 'string' },
          name: { type: 'string' },
          quantity: { type: 'string' },
          price: { type: 'number' },
          isFood: { type: 'boolean' },
        },
        required: ['receiptText', 'name', 'quantity', 'price', 'isFood'],
      },
    },
  },
  required: ['isReceipt', 'shop', 'date', 'total', 'category', 'items'],
}

export const RECEIPT_PROMPT = `Read this shop receipt (a photo, or a PDF of a digital receipt). The receipt may be in any language (often Slovenian).

- isReceipt: false if this is not a shop receipt.
- shop: the shop's name as people say it (e.g. "Mercator", "Lidl"), not the company's legal name.
- date: the purchase date as YYYY-MM-DD, or "" if you cannot read it.
- total: the amount paid, as a number, or 0 if you cannot read it.
- category: the best fit for the whole receipt (food shopping is "groceries").
- items: every bought line, skipping discounts, deposits, bags and totals.
  - receiptText: the line as printed.
  - name: a short readable English name with the size, e.g. "MLEKO 1L 3.2%" becomes "Milk 1 L", "JAJCA M 10/1" becomes "Eggs".
  - quantity: how many or how much was bought, e.g. "2" or "0.5 kg", or "" if just one.
  - price: the line's price as a number, or 0 if unclear.
  - isFood: true for food and drink, false for cleaning, bathroom, household and other non-food items.`

const clean = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const money = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null)

// A receipt date is only trusted when it is real, not in the future and less than a year old
const receiptDate = (value, today) => {
  if (!isRealDate(value)) return null
  const age = daysBetween(value, today)
  return age >= 0 && age <= 366 ? value : null
}

// Cleans the model's answer; returns null when the file was not a readable receipt
export const parseReceipt = (answer, today) => {
  if (!answer || answer.isReceipt === false) return null

  const items = (Array.isArray(answer.items) ? answer.items : [])
    .map((item) => {
      const receiptText = clean(item?.receiptText, 120)
      return {
        receiptText,
        name: clean(item?.name, 120) || receiptText,
        quantity: clean(item?.quantity, 30) || null,
        price: Number.isFinite(item?.price) && item.price >= 0 ? Math.round(item.price * 100) / 100 : null,
        isFood: item?.isFood === true,
      }
    })
    .filter((item) => item.name)
    .slice(0, MAX_ITEMS)

  const receipt = {
    shop: clean(answer.shop, 100) || null,
    date: receiptDate(clean(answer.date, 10), today),
    total: money(answer.total),
    categoryId: CATEGORY_IDS.includes(answer.category) ? answer.category : 'groceries',
    items,
  }
  return receipt.total || items.length ? receipt : null
}

// Checks the uploaded receipt: { mimeType, data } with base64 data
export const validateReceiptFile = (file) => {
  if (!file || typeof file.data !== 'string' || !file.data) return 'Add a photo or PDF of the receipt'
  if (!RECEIPT_FILE_TYPES.includes(file.mimeType)) return 'The receipt must be a photo (JPEG, PNG or WebP) or a PDF'
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)) return 'The file could not be read'
  if (Math.floor((file.data.length * 3) / 4) > MAX_FILE_BYTES) return 'The file is too large (at most 5 MB)'
  return null
}
