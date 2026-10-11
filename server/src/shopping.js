// Shopping list rules. Pure functions so they can be tested without a database.

export const DEFAULT_LIST_NAME = 'Groceries'

// The status a new item starts with, and the one that means it is finished
export const OPEN_STATUS = { buy: 'open', sell: 'listed' }
export const DONE_STATUS = { buy: 'bought', sell: 'sold' }

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')
const optionalText = (value) => trimmed(value) || null

export const normalizeListName = (name) => trimmed(name).replace(/\s+/g, ' ')

export const validateListName = (name) => {
  if (!name) return 'Enter a list name'
  if (name.length > 40) return 'List names can be at most 40 characters'
  return null
}

// Only web links: anything else (javascript:, data:) could run code when tapped
export const normalizeLink = (link) => {
  const value = trimmed(link)
  if (!value) return null
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

const isWebLink = (link) => {
  try {
    const url = new URL(link)
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname)
  } catch {
    return false
  }
}

// Builds the columns for an item from a request body. For an update, `existing` supplies every
// field the body leaves out, so the app can send just { status } to tick an item off.
export const normalizeItem = (body, existing = {}) => {
  const has = (key) => Object.hasOwn(body, key)
  const kind = has('kind') ? body.kind : existing.kind || 'buy'
  const keepsKind = kind === existing.kind
  const price = has('price') ? body.price : existing.price

  return {
    list_id: has('listId') ? body.listId : existing.list_id,
    name: has('name') ? trimmed(body.name) : existing.name,
    kind,
    // Switching between buying and selling starts the item over in its new kind
    status: has('status') ? body.status : keepsKind ? existing.status : OPEN_STATUS[kind],
    quantity: has('quantity') ? optionalText(body.quantity) : existing.quantity ?? null,
    price: price === '' || price === null || price === undefined ? null : Number(price),
    link: has('link') ? normalizeLink(body.link) : existing.link ?? null,
    note: has('note') ? optionalText(body.note) : existing.note ?? null,
  }
}

export const validateItem = (item) => {
  if (!item.list_id) return 'listId is required'
  if (!item.name) return 'Enter what to buy or sell'
  if (item.name.length > 120) return 'Names can be at most 120 characters'
  if (!['buy', 'sell'].includes(item.kind)) return 'kind must be buy or sell'
  if (![OPEN_STATUS[item.kind], DONE_STATUS[item.kind]].includes(item.status)) {
    return item.kind === 'buy' ? 'status must be open or bought' : 'status must be listed or sold'
  }
  if (item.quantity && item.quantity.length > 30) return 'Quantity can be at most 30 characters'
  if (item.price !== null && (!Number.isFinite(item.price) || item.price < 0)) return 'Price must be zero or more'
  if (item.link && (item.link.length > 2000 || !isWebLink(item.link))) return 'Link must be a web address'
  if (item.note && item.note.length > 500) return 'Notes can be at most 500 characters'
  return null
}

export const isDone = (item) => item.status === DONE_STATUS[item.kind]
