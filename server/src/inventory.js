// Household inventory rules. Pure functions so they can be tested without a database.
import { isRealDate } from './chores.js'

// The groups a household starts with, in this order
export const DEFAULT_GROUPS = ['Appliances', 'Bathroom', 'Cleaning']

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')
const optionalText = (value) => trimmed(value) || null
const optionalDate = (value) => trimmed(value) || null

// Builds the columns for an item from a request body. For an update, `existing` supplies every
// field the body leaves out, so marking it running low can send just { isRunningLow }.
export const normalizeInventoryItem = (body, existing = {}) => {
  const has = (key) => Object.hasOwn(body, key)
  const price = has('price') ? body.price : existing.price
  return {
    group_id: has('groupId') ? body.groupId : existing.group_id,
    name: has('name') ? trimmed(body.name) : existing.name,
    quantity: has('quantity') ? optionalText(body.quantity) : existing.quantity ?? null,
    note: has('note') ? optionalText(body.note) : existing.note ?? null,
    purchased_on: has('purchasedOn') ? optionalDate(body.purchasedOn) : existing.purchased_on ?? null,
    price: price === '' || price === null || price === undefined ? null : Number(price),
    warranty_until: has('warrantyUntil') ? optionalDate(body.warrantyUntil) : existing.warranty_until ?? null,
    is_running_low: has('isRunningLow') ? Boolean(body.isRunningLow) : Boolean(existing.is_running_low),
  }
}

export const validateInventoryItem = (item) => {
  if (!item.group_id) return 'groupId is required'
  if (!item.name) return 'Enter what it is'
  if (item.name.length > 120) return 'Names can be at most 120 characters'
  if (item.quantity && item.quantity.length > 30) return 'Quantity can be at most 30 characters'
  if (item.note && item.note.length > 500) return 'Notes can be at most 500 characters'
  if (item.price !== null && (!Number.isFinite(item.price) || item.price < 0)) return 'Price must be zero or more'
  if (item.purchased_on && !isRealDate(item.purchased_on)) return 'Purchase date must be a real date in YYYY-MM-DD format'
  if (item.warranty_until && !isRealDate(item.warranty_until)) return 'Warranty date must be a real date in YYYY-MM-DD format'
  if (item.purchased_on && item.warranty_until && item.warranty_until < item.purchased_on) return 'The warranty cannot end before the purchase'
  return null
}
