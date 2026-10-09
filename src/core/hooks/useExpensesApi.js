import { useCallback, useEffect, useState } from 'react'
import { createExpense, deleteExpense as deleteExpenseRequest, fetchExpenses } from '../api/expensesApi'

export const useExpensesApi = (household) => {
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const householdId = household?.household_id
  const members = household?.members || []

  const reload = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError('')

    try {
      const nextExpenses = await fetchExpenses(householdId, members)
      setExpenses(nextExpenses)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [householdId, members])

  useEffect(() => {
    reload()
  }, [reload])

  const addExpense = async (expense) => {
    if (!householdId) throw new Error('No household is connected')

    setError('')
    const createdExpense = await createExpense(householdId, expense, members)
    setExpenses((currentExpenses) => [createdExpense, ...currentExpenses])
    return createdExpense
  }

  const deleteExpense = async (expenseId) => {
    if (!householdId) throw new Error('No household is connected')

    setError('')
    await deleteExpenseRequest(householdId, expenseId)
    setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== expenseId))
  }

  return { expenses, addExpense, deleteExpense, isLoading, error, reload }
}
