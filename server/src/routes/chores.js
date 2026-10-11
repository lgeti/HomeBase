import express from 'express'
import { isRealDate, nextDueOn, normalizeChore, validateChore } from '../chores.js'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { supabase } from '../supabase.js'

const router = express.Router()
const base = '/api/households/:householdId/chores'

const findChore = (householdId, choreId) =>
  supabase
    .from('chores')
    .select('*')
    .eq('household_id', householdId)
    .eq('chore_id', choreId)
    .is('deleted_at_utc', null)
    .maybeSingle()

// Only members who have joined can be given a chore
const checkAssignee = async (householdId, memberId) => {
  if (!memberId) return null
  const { data, error } = await supabase
    .from('household_members')
    .select('household_member_id')
    .eq('household_id', householdId)
    .eq('household_member_id', memberId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) return error.message
  return data ? null : 'Chores can only be given to members who have joined this household'
}

// The most recent completion of each chore, as { chore_id: completion }
const latestCompletions = async (choreIds) => {
  if (choreIds.length === 0) return {}
  const { data, error } = await supabase
    .from('chore_completions')
    .select('*')
    .in('chore_id', choreIds)
    .order('created_at_utc', { ascending: false })

  if (error) throw error
  const latest = {}
  for (const completion of data) latest[completion.chore_id] ??= completion
  return latest
}

const withLastDone = (chore, completion) => ({
  ...chore,
  last_done_by_member_id: completion?.done_by_member_id ?? null,
  last_done_on: completion?.done_on ?? null,
})

// Chores still to do, soonest first, each with who did it last and when
router.get(base, requireAuth, requireHouseholdMember, async (request, response) => {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)
    .is('completed_at_utc', null)
    .order('due_on', { ascending: true })
    .order('created_at_utc', { ascending: true })

  if (error) return sendError(response, 500, error.message)

  try {
    const latest = await latestCompletions(data.map((chore) => chore.chore_id))
    response.json(data.map((chore) => withLastDone(chore, latest[chore.chore_id])))
  } catch (completionsError) {
    sendError(response, 500, completionsError.message)
  }
})

router.post(base, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId } = request.params
  const chore = normalizeChore(request.body)
  const validationError = validateChore(chore) || await checkAssignee(householdId, chore.assignee_member_id)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('chores')
    .insert({ ...chore, household_id: householdId, created_by_member_id: request.householdMember.household_member_id })
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(withLastDone(data, null))
})

// Accepts any subset of the fields
router.patch(`${base}/:choreId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, choreId } = request.params

  const { data: existing, error: existingError } = await findChore(householdId, choreId)
  if (existingError) return sendError(response, 500, existingError.message)
  if (!existing) return sendError(response, 404, 'Chore not found')

  const chore = normalizeChore(request.body, existing)
  const assigneeError = chore.assignee_member_id !== existing.assignee_member_id
    ? await checkAssignee(householdId, chore.assignee_member_id)
    : null
  const validationError = validateChore(chore) || assigneeError
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('chores')
    .update({ ...chore, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('chore_id', choreId)
    .is('deleted_at_utc', null)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  try {
    const latest = await latestCompletions([choreId])
    response.json(withLastDone(data, latest[choreId]))
  } catch (completionsError) {
    sendError(response, 500, completionsError.message)
  }
})

router.delete(`${base}/:choreId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('chores')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', request.params.householdId)
    .eq('chore_id', request.params.choreId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

// Done: records who did it on { doneOn } (their local date) and moves the chore to its next date,
// or finishes a one-time chore. Returns the chore (null when finished) and the completion, for undo.
router.post(`${base}/:choreId/done`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, choreId } = request.params
  const { doneOn } = request.body
  if (!isRealDate(doneOn)) return sendError(response, 400, 'doneOn must be a real date in YYYY-MM-DD format')

  const { data: chore, error: choreError } = await findChore(householdId, choreId)
  if (choreError) return sendError(response, 500, choreError.message)
  if (!chore || chore.completed_at_utc) return sendError(response, 404, 'Chore not found')

  const { data: completion, error: completionError } = await supabase
    .from('chore_completions')
    .insert({
      household_id: householdId,
      chore_id: choreId,
      done_by_member_id: request.householdMember.household_member_id,
      done_on: doneOn,
      covered_due_on: chore.due_on,
    })
    .select()
    .single()

  if (completionError) return sendError(response, 400, completionError.message)

  const nextDue = nextDueOn({ startsOn: chore.starts_on, frequency: chore.frequency, dueOn: chore.due_on, doneOn })
  const changes = nextDue ? { due_on: nextDue } : { completed_at_utc: new Date().toISOString() }

  // Only moves the chore if nobody else marked it done at the same moment
  const { data: updated, error } = await supabase
    .from('chores')
    .update({ ...changes, updated_at_utc: new Date().toISOString() })
    .eq('chore_id', choreId)
    .eq('due_on', chore.due_on)
    .is('completed_at_utc', null)
    .select()
    .maybeSingle()

  if (error || !updated) {
    await supabase.from('chore_completions').delete().eq('completion_id', completion.completion_id)
    return sendError(response, error ? 400 : 409, error?.message || 'Someone else just marked this chore done')
  }

  response.json({ chore: nextDue ? withLastDone(updated, completion) : null, completionId: completion.completion_id })
})

// Undo the latest "Done": puts the chore back on the date it covered and forgets the completion
router.post(`${base}/:choreId/undo-done`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, choreId } = request.params
  const { completionId } = request.body

  const { data: completions, error: completionsError } = await supabase
    .from('chore_completions')
    .select('*')
    .eq('household_id', householdId)
    .eq('chore_id', choreId)
    .order('created_at_utc', { ascending: false })
    .limit(2)

  if (completionsError) return sendError(response, 500, completionsError.message)
  const [latest, previous] = completions
  if (!latest || latest.completion_id !== completionId) {
    return sendError(response, 409, 'Only the latest "Done" can be undone')
  }

  const { data: chore, error } = await supabase
    .from('chores')
    .update({ due_on: latest.covered_due_on, completed_at_utc: null, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('chore_id', choreId)
    .is('deleted_at_utc', null)
    .select()
    .maybeSingle()

  if (error) return sendError(response, 400, error.message)
  if (!chore) return sendError(response, 404, 'Chore not found')

  const { error: deleteError } = await supabase.from('chore_completions').delete().eq('completion_id', latest.completion_id)
  if (deleteError) return sendError(response, 400, deleteError.message)

  response.json(withLastDone(chore, previous))
})

export default router
