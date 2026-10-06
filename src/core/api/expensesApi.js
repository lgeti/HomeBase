import { apiRequest } from './client'

const mapExpense = (expense, members = []) => {
  const payer = members.find((member) => member.household_member_id === expense.paid_by_member_id)

  return {
    id: expense.expense_id,
    categoryId: expense.category_id,
    amount: Number(expense.amount),
    tag: expense.tag || undefined,
    description: expense.description || undefined,
    date: expense.expense_date,
    whoPaid: payer?.display_name || expense.paid_by_member_id,
    paidByMemberId: expense.paid_by_member_id,
    splitType: expense.split_type,
    isRecurring: expense.is_recurring,
    recurringFrequency: expense.recurring_frequency || undefined,
    nextDueDate: expense.next_due_date || undefined,
  }
}

export const createHousehold = (name, ownerName, members = []) =>
  apiRequest('/api/households', {
    method: 'POST',
    body: JSON.stringify({ name, ownerName, members }),
  })

export const fetchMyHousehold = () => apiRequest('/api/households/me')

export const fetchExpenses = async (householdId, members) => {
  const expenses = await apiRequest(`/api/households/${householdId}/expenses`)
  return expenses.map((expense) => mapExpense(expense, members))
}

export const createExpense = async (householdId, expense, members) => {
  const createdExpense = await apiRequest(`/api/households/${householdId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expense),
  })
  return mapExpense(createdExpense, members)
}

export const deleteExpense = (householdId, expenseId) =>
  apiRequest(`/api/households/${householdId}/expenses/${expenseId}`, {
    method: 'DELETE',
  })
