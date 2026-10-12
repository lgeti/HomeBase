import { apiRequest } from './client'

// Reads a receipt (photo or PDF): { shop, date, total, categoryId, items: [{ receiptText, name, quantity, price, isFood }] }
export const scanReceipt = (householdId, file, today) =>
  apiRequest(`/api/households/${householdId}/receipt-scan`, { method: 'POST', body: JSON.stringify({ file, today }) })
