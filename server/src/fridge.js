// Food at home: fridge and pantry items. Pure functions so they can be tested without a database.
import { isDateString } from './recurring.js'

// Where a food item is kept
export const FOOD_LOCATIONS = ['fridge', 'pantry']

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')
const optionalText = (value) => trimmed(value) || null

// Builds the columns for an item from a request body. For an update, `existing` supplies every
// field the body leaves out.
export const normalizeFridgeItem = (body, existing = {}) => {
  const has = (key) => Object.hasOwn(body, key)
  return {
    name: has('name') ? trimmed(body.name) : existing.name,
    quantity: has('quantity') ? optionalText(body.quantity) : existing.quantity ?? null,
    expires_on: has('expiresOn') ? optionalText(body.expiresOn) : existing.expires_on ?? null,
    note: has('note') ? optionalText(body.note) : existing.note ?? null,
    location: has('location') ? body.location : existing.location || 'fridge',
  }
}

const isRealDate = (value) => {
  if (!isDateString(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export const validateFridgeItem = (item) => {
  if (!item.name) return 'Enter what it is'
  if (!FOOD_LOCATIONS.includes(item.location)) return 'location must be fridge or pantry'
  if (item.name.length > 120) return 'Names can be at most 120 characters'
  if (item.quantity && item.quantity.length > 30) return 'Quantity can be at most 30 characters'
  if (item.expires_on && !isRealDate(item.expires_on)) return 'Expiry date must be a real date in YYYY-MM-DD format'
  if (item.note && item.note.length > 500) return 'Notes can be at most 500 characters'
  return null
}
