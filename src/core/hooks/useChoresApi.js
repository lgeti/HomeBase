import { useCallback, useEffect, useState } from 'react'
import { createChore, deleteChore, fetchChores, markChoreDone, undoChoreDone, updateChore } from '../api/choresApi'

export const useChoresApi = (household) => {
  const [chores, setChores] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const householdId = household?.household_id

  const reload = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError('')

    try {
      setChores(await fetchChores(householdId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    reload()
  }, [reload])

  const replaceChore = (chore) => setChores((current) => current.map((existing) => (existing.id === chore.id ? chore : existing)))

  const addChore = async (body) => {
    const chore = await createChore(householdId, body)
    setChores((current) => [...current, chore])
    return chore
  }

  const editChore = async (choreId, changes) => {
    const chore = await updateChore(householdId, choreId, changes)
    replaceChore(chore)
    return chore
  }

  const removeChore = async (choreId) => {
    await deleteChore(householdId, choreId)
    setChores((current) => current.filter((chore) => chore.id !== choreId))
  }

  // Returns what undo needs: the chore as it was and the completion id
  const markDone = async (chore, doneOn) => {
    const { chore: moved, completionId } = await markChoreDone(householdId, chore.id, doneOn)
    if (moved) replaceChore(moved)
    else setChores((current) => current.filter((existing) => existing.id !== chore.id))
    return { chore, completionId }
  }

  const undoDone = async ({ chore, completionId }) => {
    const restored = await undoChoreDone(householdId, chore.id, completionId)
    setChores((current) =>
      current.some((existing) => existing.id === restored.id) ? current.map((existing) => (existing.id === restored.id ? restored : existing)) : [...current, restored]
    )
  }

  return { chores, isLoading, error, reload, addChore, editChore, removeChore, markDone, undoDone }
}
