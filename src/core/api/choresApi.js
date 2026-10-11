import { apiRequest } from './client'

const mapChore = (chore) => ({
  id: chore.chore_id,
  name: chore.name,
  note: chore.note || undefined,
  assigneeMemberId: chore.assignee_member_id || undefined,
  frequency: chore.frequency,
  dueOn: chore.due_on,
  lastDoneByMemberId: chore.last_done_by_member_id || undefined,
  lastDoneOn: chore.last_done_on || undefined,
})

const choresPath = (householdId) => `/api/households/${householdId}/chores`

export const fetchChores = async (householdId) => (await apiRequest(choresPath(householdId))).map(mapChore)

export const createChore = async (householdId, chore) =>
  mapChore(await apiRequest(choresPath(householdId), { method: 'POST', body: JSON.stringify(chore) }))

export const updateChore = async (householdId, choreId, changes) =>
  mapChore(await apiRequest(`${choresPath(householdId)}/${choreId}`, { method: 'PATCH', body: JSON.stringify(changes) }))

export const deleteChore = (householdId, choreId) =>
  apiRequest(`${choresPath(householdId)}/${choreId}`, { method: 'DELETE' })

// Returns the moved chore (null when a one-time chore is finished) and the completion id for undo
export const markChoreDone = async (householdId, choreId, doneOn) => {
  const { chore, completionId } = await apiRequest(`${choresPath(householdId)}/${choreId}/done`, {
    method: 'POST',
    body: JSON.stringify({ doneOn }),
  })
  return { chore: chore ? mapChore(chore) : null, completionId }
}

export const undoChoreDone = async (householdId, choreId, completionId) =>
  mapChore(await apiRequest(`${choresPath(householdId)}/${choreId}/undo-done`, {
    method: 'POST',
    body: JSON.stringify({ completionId }),
  }))
