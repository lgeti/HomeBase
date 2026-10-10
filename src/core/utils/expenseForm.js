import { todayDateString } from './calculations.js'

// Form values for a new expense, or for editing `expense` when one is given
export const initialFormData = ({ expense, categoryId = 'groceries', payerId = '', today = todayDateString() } = {}) => {
  if (!expense) {
    return {
      amount: '',
      categoryId,
      tag: '',
      description: '',
      date: today,
      paidByMemberId: payerId,
      splitType: 'one',
      isRecurring: false,
      recurringFrequency: 'monthly',
    }
  }

  return {
    amount: String(expense.amount),
    categoryId: expense.categoryId,
    tag: expense.tag || '',
    description: expense.description || '',
    date: expense.date,
    paidByMemberId: expense.paidByMemberId,
    splitType: expense.splitType,
    isRecurring: Boolean(expense.isRecurring),
    recurringFrequency: expense.recurringFrequency || 'monthly',
  }
}

// The full expense the API expects, for both create and update
export const formDataToExpense = (formData) => ({
  categoryId: formData.categoryId,
  amount: parseFloat(formData.amount),
  tag: formData.tag || undefined,
  description: formData.description || undefined,
  date: formData.date,
  paidByMemberId: formData.paidByMemberId,
  splitType: formData.splitType,
  isRecurring: formData.isRecurring,
  recurringFrequency: formData.recurringFrequency,
})

// fetch() reports an unreachable API as a bare "Failed to fetch" (Chrome) or "Load failed" (Safari)
export const friendlySaveError = (error) => {
  const message = error?.message || ''
  if (error?.name === 'TypeError' && /fetch|load failed|network/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message || 'Could not save. Please try again.'
}
