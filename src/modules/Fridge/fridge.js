// Fridge helpers: how fresh an item is and how the list is grouped. `today` is a local 'YYYY-MM-DD'.
import { formatShortDate, parseLocalDate } from '../../core/utils/calculations.js'
import { addDays, daysUntil } from '../../core/utils/dates.js'

export { addDays, daysUntil }

// Items expiring within this many days show under "Use soon"
export const USE_SOON_DAYS = 3

// 'expired', 'soon', 'ok', or 'none' when the item has no expiry date
export const freshness = (item, today) => {
  if (!item.expiresOn) return 'none'
  const days = daysUntil(item.expiresOn, today)
  if (days < 0) return 'expired'
  if (days <= USE_SOON_DAYS) return 'soon'
  return 'ok'
}

export const expiryLabel = (item, today) => {
  if (!item.expiresOn) return null
  const days = daysUntil(item.expiresOn, today)
  if (days < -1) return `Expired ${-days} days ago`
  if (days === -1) return 'Expired yesterday'
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days <= USE_SOON_DAYS) return `Expires in ${days} days`
  return `Expires ${formatShortDate(item.expiresOn, parseLocalDate(today))}`
}

// "Use soon" (expired and expiring, soonest first) and everything else (dated first, then undated)
export const groupFridgeItems = (items, today) => {
  const byDate = [...items].sort((a, b) => {
    if (a.expiresOn && b.expiresOn) return a.expiresOn.localeCompare(b.expiresOn)
    if (a.expiresOn) return -1
    if (b.expiresOn) return 1
    return 0
  })
  const isUrgent = (item) => ['expired', 'soon'].includes(freshness(item, today))
  return { useSoon: byDate.filter(isUrgent), rest: byDate.filter((item) => !isUrgent(item)) }
}

// Where food is kept, with the words the screens use for it
export const LOCATIONS = {
  fridge: { label: 'Fridge', in: 'in the fridge', to: 'to the fridge' },
  pantry: { label: 'Pantry', in: 'in the pantry', to: 'to the pantry' },
}

export const itemsIn = (items, location) => items.filter((item) => (item.location || 'fridge') === location)

export const initialFridgeForm = (item, location = 'fridge') => ({
  location: item?.location ?? location,
  name: item?.name ?? '',
  quantity: item?.quantity ?? '',
  expiresOn: item?.expiresOn ?? '',
  note: item?.note ?? '',
})

// Empty optional fields are sent empty so editing can clear them
export const fridgeFormToBody = (form) => ({
  location: form.location,
  name: form.name.trim(),
  quantity: form.quantity.trim(),
  expiresOn: form.expiresOn,
  note: form.note.trim(),
})
