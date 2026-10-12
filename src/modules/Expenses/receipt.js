// Turning a scanned receipt into an expense, fridge and inventory items, and ticks on shopping lists
import { foodWords } from '../Fridge/recipes.js'

// Where a receipt line goes: 'fridge', 'inventory:<group id>', or 'skip'
export const FRIDGE = 'fridge'
export const SKIP = 'skip'
export const toInventory = (groupId) => `inventory:${groupId}`
export const inventoryGroupOf = (destination) => (destination?.startsWith('inventory:') ? destination.slice(10) : null)

// The household group the receipt reader suggested for a non-food line ("Bathroom"), matched by name
export const suggestedGroup = (item, groups) =>
  groups.find((group) => group.name.toLowerCase() === (item.inventoryGroup || '').toLowerCase()) || null

// Receipt lines for review: food goes to the fridge; everything else is offered for the inventory but not added
export const reviewItems = (items) => items.map((item, index) => ({ ...item, key: index, destination: item.isFood ? FRIDGE : SKIP }))

export const fridgeItemsFrom = (items) =>
  items.filter((item) => item.destination === FRIDGE && item.name.trim()).map((item) => ({ name: item.name.trim(), quantity: item.quantity || '' }))

// Inventory items from the receipt, with its price and the purchase date
export const inventoryItemsFrom = (items, purchasedOn) =>
  items
    .filter((item) => inventoryGroupOf(item.destination) && item.name.trim())
    .map((item) => ({
      groupId: inventoryGroupOf(item.destination),
      name: item.name.trim(),
      quantity: item.quantity || '',
      price: item.price ?? '',
      purchasedOn: purchasedOn || '',
    }))

// Open items on shopping lists that were just bought: they share a word with a line on the receipt
export const boughtShoppingItems = (items, shoppingItems) => {
  const words = new Set(items.flatMap((item) => foodWords(item.name)))
  if (words.size === 0) return []
  return shoppingItems.filter((item) =>
    item.kind === 'buy' && item.status === 'open' && foodWords(item.name).some((word) => words.has(word)))
}

// Inventory items marked running low that this receipt restocks: they share a word with a line on it
export const restockedInventoryItems = (items, inventoryItems) => {
  const words = new Set(items.flatMap((item) => foodWords(item.name)))
  if (words.size === 0) return []
  return inventoryItems.filter((item) => item.isRunningLow && foodWords(item.name).some((word) => words.has(word)))
}

// The expense form after a scan: only what the receipt actually told us is changed
export const formWithReceipt = (formData, receipt) => ({
  ...formData,
  amount: receipt.total ? String(receipt.total) : formData.amount,
  date: receipt.date || formData.date,
  description: receipt.shop || formData.description,
  categoryId: receipt.categoryId || formData.categoryId,
  tag: receipt.categoryId && receipt.categoryId !== formData.categoryId ? '' : formData.tag,
})
