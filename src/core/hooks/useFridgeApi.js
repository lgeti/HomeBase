import { useCallback, useEffect, useState } from 'react'
import { createFridgeItem, deleteFridgeItem, fetchFridgeItems, updateFridgeItem, markFridgeItemUsedUp } from '../api/fridgeApi'

export const useFridgeApi = (household) => {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const householdId = household?.household_id

  const reload = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError('')

    try {
      setItems(await fetchFridgeItems(householdId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    reload()
  }, [reload])

  const addItem = async (body) => {
    const item = await createFridgeItem(householdId, body)
    setItems((current) => [...current, item])
    return item
  }

  const updateItem = async (itemId, changes) => {
    const item = await updateFridgeItem(householdId, itemId, changes)
    setItems((current) => current.map((existing) => (existing.id === itemId ? item : existing)))
    return item
  }

  const removeItem = async (itemId) => {
    await deleteFridgeItem(householdId, itemId)
    setItems((current) => current.filter((item) => item.id !== itemId))
  }

  // Returns the shopping item created when a list was chosen, otherwise null
  const markUsedUp = async (itemId, listId) => {
    const shoppingItem = await markFridgeItemUsedUp(householdId, itemId, listId)
    setItems((current) => current.filter((item) => item.id !== itemId))
    return shoppingItem
  }

  return { items, isLoading, error, reload, addItem, updateItem, removeItem, markUsedUp }
}
