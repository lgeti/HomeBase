import { useCallback, useEffect, useState } from 'react'
import {
  createInventoryGroup,
  createInventoryItem,
  deleteInventoryGroup,
  deleteInventoryItem,
  fetchInventoryGroups,
  fetchInventoryItems,
  renameInventoryGroup,
  updateInventoryItem,
} from '../api/inventoryApi'

export const useInventoryApi = (household) => {
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const householdId = household?.household_id

  const reload = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError('')

    try {
      // Groups first: the first visit creates Appliances, Bathroom and Cleaning
      const nextGroups = await fetchInventoryGroups(householdId)
      const nextItems = await fetchInventoryItems(householdId)
      setGroups(nextGroups)
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

  const addGroup = async (name) => {
    const group = await createInventoryGroup(householdId, name)
    setGroups((current) => [...current, group])
    return group
  }

  const renameGroup = async (groupId, name) => {
    const group = await renameInventoryGroup(householdId, groupId, name)
    setGroups((current) => current.map((existing) => (existing.id === groupId ? group : existing)))
  }

  const removeGroup = async (groupId) => {
    await deleteInventoryGroup(householdId, groupId)
    setGroups((current) => current.filter((group) => group.id !== groupId))
    setItems((current) => current.filter((item) => item.groupId !== groupId))
  }

  const addItem = async (body) => {
    const item = await createInventoryItem(householdId, body)
    setItems((current) => [...current, item])
    return item
  }

  const updateItem = async (itemId, changes) => {
    const item = await updateInventoryItem(householdId, itemId, changes)
    setItems((current) => current.map((existing) => (existing.id === itemId ? item : existing)))
    return item
  }

  const removeItem = async (itemId) => {
    await deleteInventoryItem(householdId, itemId)
    setItems((current) => current.filter((item) => item.id !== itemId))
  }

  return { groups, items, isLoading, error, reload, addGroup, renameGroup, removeGroup, addItem, updateItem, removeItem }
}
