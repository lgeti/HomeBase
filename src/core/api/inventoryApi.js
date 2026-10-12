import { apiRequest } from './client'

const mapGroup = (group) => ({ id: group.group_id, name: group.name })

const mapItem = (item) => ({
  id: item.item_id,
  groupId: item.group_id,
  name: item.name,
  quantity: item.quantity || undefined,
  note: item.note || undefined,
  purchasedOn: item.purchased_on || undefined,
  price: item.price === null ? undefined : Number(item.price),
  warrantyUntil: item.warranty_until || undefined,
  isRunningLow: Boolean(item.is_running_low),
})

const groupsPath = (householdId) => `/api/households/${householdId}/inventory-groups`
const itemsPath = (householdId) => `/api/households/${householdId}/inventory-items`

export const fetchInventoryGroups = async (householdId) => (await apiRequest(groupsPath(householdId))).map(mapGroup)

export const createInventoryGroup = async (householdId, name) =>
  mapGroup(await apiRequest(groupsPath(householdId), { method: 'POST', body: JSON.stringify({ name }) }))

export const renameInventoryGroup = async (householdId, groupId, name) =>
  mapGroup(await apiRequest(`${groupsPath(householdId)}/${groupId}`, { method: 'PATCH', body: JSON.stringify({ name }) }))

export const deleteInventoryGroup = (householdId, groupId) =>
  apiRequest(`${groupsPath(householdId)}/${groupId}`, { method: 'DELETE' })

export const fetchInventoryItems = async (householdId) => (await apiRequest(itemsPath(householdId))).map(mapItem)

export const createInventoryItem = async (householdId, item) =>
  mapItem(await apiRequest(itemsPath(householdId), { method: 'POST', body: JSON.stringify(item) }))

// Send only the fields that change, for example { isRunningLow: true }
export const updateInventoryItem = async (householdId, itemId, changes) =>
  mapItem(await apiRequest(`${itemsPath(householdId)}/${itemId}`, { method: 'PATCH', body: JSON.stringify(changes) }))

export const deleteInventoryItem = (householdId, itemId) =>
  apiRequest(`${itemsPath(householdId)}/${itemId}`, { method: 'DELETE' })
