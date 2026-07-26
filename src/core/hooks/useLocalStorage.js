import { useState, useEffect } from 'react'

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

export const useUser = () => {
  const [user, setUser] = useLocalStorage('homebase_user', null)
  return { user, setUser }
}

export const useExpenses = () => {
  const [expenses, setExpenses] = useLocalStorage('homebase_expenses', [])

  const addExpense = (expense) => {
    const newExpense = {
      id: expense.id || Date.now(),
      ...expense,
      date: expense.date || new Date().toISOString(),
    }
    setExpenses((currentExpenses) => [newExpense, ...currentExpenses])
    return newExpense
  }

  const deleteExpense = (id) => {
    setExpenses((currentExpenses) => currentExpenses.filter((exp) => exp.id !== id))
  }

  const updateExpense = (id, updates) => {
    setExpenses((currentExpenses) =>
      currentExpenses.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    )
  }

  return { expenses, addExpense, deleteExpense, updateExpense, setExpenses }
}
