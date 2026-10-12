import { apiRequest } from './client'
import { mapShoppingItem } from './shoppingApi'

const mapFridgeItem = (item) => ({
  id: item.item_id,
  name: item.name,
  quantity: item.quantity || undefined,
  expiresOn: item.expires_on || undefined,
  note: item.note || undefined,
  location: item.location || 'fridge',
  addedByMemberId: item.added_by_member_id || undefined,
})

const itemsPath = (householdId) => `/api/households/${householdId}/fridge-items`

export const fetchFridgeItems = async (householdId) => (await apiRequest(itemsPath(householdId))).map(mapFridgeItem)

export const createFridgeItem = async (householdId, item) =>
  mapFridgeItem(await apiRequest(itemsPath(householdId), { method: 'POST', body: JSON.stringify(item) }))

export const updateFridgeItem = async (householdId, itemId, changes) =>
  mapFridgeItem(await apiRequest(`${itemsPath(householdId)}/${itemId}`, { method: 'PATCH', body: JSON.stringify(changes) }))

export const deleteFridgeItem = (householdId, itemId) =>
  apiRequest(`${itemsPath(householdId)}/${itemId}`, { method: 'DELETE' })

// Removes the item; with a listId it also goes on that shopping list, and the new shopping item is returned
export const markFridgeItemUsedUp = async (householdId, itemId, listId) => {
  const { shoppingItem } = await apiRequest(`${itemsPath(householdId)}/${itemId}/used-up`, {
    method: 'POST',
    body: JSON.stringify({ listId: listId || undefined }),
  })
  return shoppingItem ? mapShoppingItem(shoppingItem) : null
}
