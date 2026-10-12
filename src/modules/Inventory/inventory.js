// Inventory helpers: ordering a group and describing warranties. `today` is a local 'YYYY-MM-DD'.
import { formatShortDate, parseLocalDate } from '../../core/utils/calculations.js'
import { daysUntil } from '../../core/utils/dates.js'

// Warranties ending within this many days are pointed out
export const WARRANTY_SOON_DAYS = 60

// A group's items: running low first, then by name
export const groupItems = (items, groupId) =>
  items
    .filter((item) => item.groupId === groupId)
    .sort((a, b) => Number(b.isRunningLow) - Number(a.isRunningLow) || a.name.localeCompare(b.name))

export const countRunningLow = (items, groupId) => items.filter((item) => item.groupId === groupId && item.isRunningLow).length

// { text, state } where state is 'ended', 'soon' or 'ok'; null without a warranty date
export const warrantyStatus = (item, today) => {
  if (!item.warrantyUntil) return null
  const days = daysUntil(item.warrantyUntil, today)
  const date = formatShortDate(item.warrantyUntil, parseLocalDate(today))
  if (days < 0) return { text: `Warranty ended ${date}`, state: 'ended' }
  if (days === 0) return { text: 'Warranty ends today', state: 'soon' }
  if (days <= WARRANTY_SOON_DAYS) return { text: `Warranty ends in ${days} day${days === 1 ? '' : 's'}`, state: 'soon' }
  return { text: `Warranty until ${date}`, state: 'ok' }
}

// The date a warranty of `years` years from the purchase ends
export const warrantyEnd = (purchasedOn, years) => {
  const [year, month, day] = purchasedOn.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year + years, month, 0)).getUTCDate()
  return `${year + years}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export const initialInventoryForm = ({ item, groupId } = {}) => ({
  groupId: item?.groupId ?? groupId ?? '',
  name: item?.name ?? '',
  quantity: item?.quantity ?? '',
  price: item?.price === undefined || item?.price === null ? '' : String(item.price),
  purchasedOn: item?.purchasedOn ?? '',
  warrantyUntil: item?.warrantyUntil ?? '',
  note: item?.note ?? '',
})

// Empty optional fields are sent empty so editing can clear them
export const inventoryFormToBody = (form) => ({
  groupId: form.groupId,
  name: form.name.trim(),
  quantity: form.quantity.trim(),
  price: form.price === '' ? '' : Number(form.price),
  purchasedOn: form.purchasedOn,
  warrantyUntil: form.warrantyUntil,
  note: form.note.trim(),
})
