import { apiRequest } from './client'

// The household's plan, limits and this month's usage:
// { plan, name, features: { mcp }, members: { used, limit }, usage: { ai_call: { used, limit } } }; a null limit means unlimited
export const fetchPlan = (householdId) => apiRequest(`/api/households/${householdId}/plan`)
