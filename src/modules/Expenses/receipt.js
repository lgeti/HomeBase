// Turning a scanned receipt into an expense, fridge items and ticks on shopping lists
import { foodWords } from '../Fridge/recipes.js'

// Receipt lines for review: food is ticked for the fridge, everything else is not
export const reviewItems = (items) => items.map((item, index) => ({ ...item, key: index, toFridge: item.isFood }))

export const fridgeItemsFrom = (items) =>
  items.filter((item) => item.toFridge && item.name.trim()).map((item) => ({ name: item.name.trim(), quantity: item.quantity || '' }))

// Open items on shopping lists that were just bought: they share a food word with a ticked receipt line
export const boughtShoppingItems = (items, shoppingItems) => {
  const words = new Set(items.filter((item) => item.toFridge).flatMap((item) => foodWords(item.name)))
  if (words.size === 0) return []
  return shoppingItems.filter((item) =>
    item.kind === 'buy' && item.status === 'open' && foodWords(item.name).some((word) => words.has(word)))
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
