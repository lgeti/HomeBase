import { apiRequest } from './client'

// Reads a receipt photo: { shop, date, total, categoryId, items: [{ receiptText, name, quantity, price, isFood }] }
export const scanReceipt = (householdId, image, today) =>
  apiRequest(`/api/households/${householdId}/receipt-scan`, { method: 'POST', body: JSON.stringify({ image, today }) })
