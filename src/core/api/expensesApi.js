import { apiRequest } from './client'

const mapExpense = (expense) => {
  return {
    id: expense.expense_id,
    categoryId: expense.category_id,
    amount: Number(expense.amount),
    tag: expense.tag || undefined,
    description: expense.description || undefined,
    date: expense.expense_date,
    paidByMemberId: expense.paid_by_member_id,
    splitType: expense.split_type,
    isRecurring: expense.is_recurring,
    recurringFrequency: expense.recurring_frequency || undefined,
    nextDueDate: expense.next_due_date || undefined,
    isAutoAdded: Boolean(expense.recurring_source_id),
  }
}

export const createHousehold = (name, ownerName, members = []) =>
  apiRequest('/api/households', {
    method: 'POST',
    body: JSON.stringify({ name, ownerName, members }),
  })

export const fetchMyHousehold = () => apiRequest('/api/households/me')

// Pass memberId to invite an existing pending member, or displayName to add someone new
export const createInvitation = (householdId, { email, memberId, displayName }) =>
  apiRequest(`/api/households/${householdId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, memberId, displayName }),
  })

export const updateMyDisplayName = (householdId, displayName) =>
  apiRequest(`/api/households/${householdId}/members/me`, {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  })

export const removeMember = (householdId, memberId) =>
  apiRequest(`/api/households/${householdId}/members/${memberId}`, { method: 'DELETE' })

export const acceptInvitation = (token) =>
  apiRequest(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' })

export const fetchExpenses = async (householdId) => {
  const expenses = await apiRequest(`/api/households/${householdId}/expenses`)
  return expenses.map(mapExpense)
}

export const createExpense = async (householdId, expense) => {
  const createdExpense = await apiRequest(`/api/households/${householdId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expense),
  })
  return mapExpense(createdExpense)
}

export const deleteExpense = (householdId, expenseId) =>
  apiRequest(`/api/households/${householdId}/expenses/${expenseId}`, {
    method: 'DELETE',
  })
