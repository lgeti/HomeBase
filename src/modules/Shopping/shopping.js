// Shopping list helpers shared by the list screen and the item form

export const OPEN_STATUS = { buy: 'open', sell: 'listed' }
export const DONE_STATUS = { buy: 'bought', sell: 'sold' }

export const isDone = (item) => item.status === DONE_STATUS[item.kind]

// The status after tapping an item's check (or Sold) button
export const toggledStatus = (item) => (isDone(item) ? OPEN_STATUS[item.kind] : DONE_STATUS[item.kind])

// A list's items split into what is still to do and what is done, each in the order added
export const groupListItems = (items, listId) => {
  const listItems = items.filter((item) => item.listId === listId)
  return {
    open: listItems.filter((item) => !isDone(item)),
    done: listItems.filter(isDone),
  }
}

export const countOpenItems = (items, listId) => groupListItems(items, listId).open.length

// The list to show: the chosen one while it exists, otherwise the first
export const resolveActiveListId = (lists, chosenId) =>
  lists.some((list) => list.id === chosenId) ? chosenId : lists[0]?.id ?? null

// "example.com" from a full link, for showing where a link goes
export const linkHost = (link) => {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

export const initialItemForm = ({ item, listId, kind = 'buy' } = {}) => ({
  listId: item?.listId ?? listId ?? '',
  kind: item?.kind ?? kind,
  name: item?.name ?? '',
  quantity: item?.quantity ?? '',
  price: item?.price === undefined || item?.price === null ? '' : String(item.price),
  link: item?.link ?? '',
  note: item?.note ?? '',
})

// The body the API expects; empty optional fields are sent empty so editing can clear them
export const itemFormToBody = (form) => ({
  listId: form.listId,
  kind: form.kind,
  name: form.name.trim(),
  quantity: form.quantity.trim(),
  price: form.price === '' ? '' : Number(form.price),
  link: form.link.trim(),
  note: form.note.trim(),
})
