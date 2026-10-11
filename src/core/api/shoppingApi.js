import { apiRequest } from './client'

const mapList = (list) => ({
  id: list.list_id,
  name: list.name,
})

const mapItem = (item) => ({
  id: item.item_id,
  listId: item.list_id,
  name: item.name,
  kind: item.kind,
  status: item.status,
  quantity: item.quantity || undefined,
  price: item.price === null ? undefined : Number(item.price),
  link: item.link || undefined,
  note: item.note || undefined,
  addedByMemberId: item.added_by_member_id || undefined,
  doneByMemberId: item.done_by_member_id || undefined,
})

const listsPath = (householdId) => `/api/households/${householdId}/shopping-lists`
const itemsPath = (householdId) => `/api/households/${householdId}/shopping-items`

export const fetchShoppingLists = async (householdId) => (await apiRequest(listsPath(householdId))).map(mapList)

export const createShoppingList = async (householdId, name) =>
  mapList(await apiRequest(listsPath(householdId), { method: 'POST', body: JSON.stringify({ name }) }))

export const renameShoppingList = async (householdId, listId, name) =>
  mapList(await apiRequest(`${listsPath(householdId)}/${listId}`, { method: 'PATCH', body: JSON.stringify({ name }) }))

export const deleteShoppingList = (householdId, listId) =>
  apiRequest(`${listsPath(householdId)}/${listId}`, { method: 'DELETE' })

export const clearDoneShoppingItems = (householdId, listId) =>
  apiRequest(`${listsPath(householdId)}/${listId}/clear-done`, { method: 'POST' })

export const fetchShoppingItems = async (householdId) => (await apiRequest(itemsPath(householdId))).map(mapItem)

export const createShoppingItem = async (householdId, item) =>
  mapItem(await apiRequest(itemsPath(householdId), { method: 'POST', body: JSON.stringify(item) }))

// Send only the fields that change, for example { status: 'bought' }
export const updateShoppingItem = async (householdId, itemId, changes) =>
  mapItem(await apiRequest(`${itemsPath(householdId)}/${itemId}`, { method: 'PATCH', body: JSON.stringify(changes) }))

export const deleteShoppingItem = (householdId, itemId) =>
  apiRequest(`${itemsPath(householdId)}/${itemId}`, { method: 'DELETE' })
