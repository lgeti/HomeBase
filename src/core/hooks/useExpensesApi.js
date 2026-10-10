import { useCallback, useEffect, useState } from 'react'
import {
  createExpense,
  deleteExpense as deleteExpenseRequest,
  fetchExpenses,
  updateExpense as updateExpenseRequest,
} from '../api/expensesApi'

export const useExpensesApi = (household) => {
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const householdId = household?.household_id

  const reload = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError('')

    try {
      const nextExpenses = await fetchExpenses(householdId)
      setExpenses(nextExpenses)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    reload()
  }, [reload])

  const addExpense = async (expense) => {
    if (!householdId) throw new Error('No household is connected')

    setError('')
    const createdExpense = await createExpense(householdId, expense)
    setExpenses((currentExpenses) => [createdExpense, ...currentExpenses])
    return createdExpense
  }

  const updateExpense = async (expenseId, expense) => {
    if (!householdId) throw new Error('No household is connected')

    setError('')
    const updatedExpense = await updateExpenseRequest(householdId, expenseId, expense)
    setExpenses((currentExpenses) =>
      currentExpenses.map((current) => (current.id === expenseId ? updatedExpense : current))
    )
    return updatedExpense
  }

  const deleteExpense = async (expenseId) => {
    if (!householdId) throw new Error('No household is connected')

    setError('')
    await deleteExpenseRequest(householdId, expenseId)
    setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== expenseId))
  }

  return { expenses, addExpense, updateExpense, deleteExpense, isLoading, error, reload }
}
