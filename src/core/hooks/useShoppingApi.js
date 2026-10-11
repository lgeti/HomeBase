import { useCallback, useEffect, useState } from 'react'
import {
  clearDoneShoppingItems,
  createShoppingItem,
  createShoppingList,
  deleteShoppingItem,
  deleteShoppingList,
  fetchShoppingItems,
  fetchShoppingLists,
  renameShoppingList,
  updateShoppingItem,
} from '../api/shoppingApi'
import { isDone } from '../../modules/Shopping/shopping'

export const useShoppingApi = (household) => {
  const [lists, setLists] = useState([])
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const householdId = household?.household_id

  const reload = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError('')

    try {
      // Lists first: the first visit creates the Groceries list
      const nextLists = await fetchShoppingLists(householdId)
      const nextItems = await fetchShoppingItems(householdId)
      setLists(nextLists)
      setItems(nextItems)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    reload()
  }, [reload])

  const replaceItem = (updatedItem) =>
    setItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)))

  const addList = async (name) => {
    const list = await createShoppingList(householdId, name)
    setLists((current) => [...current, list])
    return list
  }

  const renameList = async (listId, name) => {
    const list = await renameShoppingList(householdId, listId, name)
    setLists((current) => current.map((existing) => (existing.id === listId ? list : existing)))
    return list
  }

  const removeList = async (listId) => {
    await deleteShoppingList(householdId, listId)
    setLists((current) => current.filter((list) => list.id !== listId))
    setItems((current) => current.filter((item) => item.listId !== listId))
  }

  const addItem = async (body) => {
    const item = await createShoppingItem(householdId, body)
    setItems((current) => [...current, item])
    return item
  }

  const updateItem = async (itemId, changes) => {
    const item = await updateShoppingItem(householdId, itemId, changes)
    replaceItem(item)
    return item
  }

  // Ticking feels instant: the change shows at once and is undone if the server refuses it
  const setItemStatus = async (item, status) => {
    setError('')
    replaceItem({ ...item, status })
    try {
      replaceItem(await updateShoppingItem(householdId, item.id, { status }))
    } catch (requestError) {
      replaceItem(item)
      setError(requestError.message)
    }
  }

  const removeItem = async (itemId) => {
    await deleteShoppingItem(householdId, itemId)
    setItems((current) => current.filter((item) => item.id !== itemId))
  }

  const clearDone = async (listId) => {
    await clearDoneShoppingItems(householdId, listId)
    setItems((current) => current.filter((item) => item.listId !== listId || !isDone(item)))
  }

  return {
    lists,
    items,
    isLoading,
    error,
    setError,
    reload,
    addList,
    renameList,
    removeList,
    addItem,
    updateItem,
    setItemStatus,
    removeItem,
    clearDone,
  }
}
