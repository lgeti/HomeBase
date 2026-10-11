import express from 'express'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import {
  DEFAULT_LIST_NAME,
  DONE_STATUS,
  isDone,
  normalizeItem,
  normalizeListName,
  validateItem,
  validateListName,
} from '../shopping.js'
import { supabase } from '../supabase.js'

const router = express.Router()
const base = '/api/households/:householdId'

// Unique index on (household, lower(name)) among lists that are not deleted
const isDuplicateName = (error) => error?.code === '23505'
const DUPLICATE_NAME = 'There is already a list with that name'

const findList = (householdId, listId) =>
  supabase
    .from('shopping_lists')
    .select('*')
    .eq('household_id', householdId)
    .eq('list_id', listId)
    .is('deleted_at_utc', null)
    .maybeSingle()

const findItem = (householdId, itemId) =>
  supabase
    .from('shopping_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .is('deleted_at_utc', null)
    .maybeSingle()

// The household's lists, oldest first. A household with none gets a Groceries list.
router.get(`${base}/shopping-lists`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId } = request.params
  const selectLists = () =>
    supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at_utc', null)
      .order('created_at_utc', { ascending: true })

  let { data, error } = await selectLists()
  if (error) return sendError(response, 500, error.message)

  if (data.length === 0) {
    const { error: insertError } = await supabase
      .from('shopping_lists')
      .insert({ household_id: householdId, name: DEFAULT_LIST_NAME })
    // Two first visits at once: the other one already created it
    if (insertError && !isDuplicateName(insertError)) return sendError(response, 500, insertError.message)

    ;({ data, error } = await selectLists())
    if (error) return sendError(response, 500, error.message)
  }

  response.json(data)
})

router.post(`${base}/shopping-lists`, requireAuth, requireHouseholdMember, async (request, response) => {
  const name = normalizeListName(request.body.name)
  const validationError = validateListName(name)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      household_id: request.params.householdId,
      name,
      created_by_member_id: request.householdMember.household_member_id,
    })
    .select()
    .single()

  if (isDuplicateName(error)) return sendError(response, 409, DUPLICATE_NAME)
  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Rename a list
router.patch(`${base}/shopping-lists/:listId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, listId } = request.params
  const name = normalizeListName(request.body.name)
  const validationError = validateListName(name)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('shopping_lists')
    .update({ name, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('list_id', listId)
    .is('deleted_at_utc', null)
    .select()
    .maybeSingle()

  if (isDuplicateName(error)) return sendError(response, 409, DUPLICATE_NAME)
  if (error) return sendError(response, 400, error.message)
  if (!data) return sendError(response, 404, 'List not found')
  response.json(data)
})

// Soft delete: the list and its items stay in the database but are hidden
router.delete(`${base}/shopping-lists/:listId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, listId } = request.params
  const { error } = await supabase
    .from('shopping_lists')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('list_id', listId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

// Every item on the household's lists, in the order they were added
router.get(`${base}/shopping-items`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*, shopping_lists!inner(deleted_at_utc)')
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)
    .is('shopping_lists.deleted_at_utc', null)
    .order('created_at_utc', { ascending: true })

  if (error) return sendError(response, 500, error.message)
  response.json(data.map(({ shopping_lists: _list, ...item }) => item))
})

router.post(`${base}/shopping-items`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId } = request.params
  const item = normalizeItem(request.body)
  const validationError = validateItem(item)
  if (validationError) return sendError(response, 400, validationError)

  const { data: list, error: listError } = await findList(householdId, item.list_id)
  if (listError) return sendError(response, 500, listError.message)
  if (!list) return sendError(response, 400, 'That list no longer exists')

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({ ...item, household_id: householdId, added_by_member_id: request.householdMember.household_member_id })
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Accepts any subset of the fields, so ticking an item off can send just { status }
router.patch(`${base}/shopping-items/:itemId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, itemId } = request.params

  const { data: existing, error: existingError } = await findItem(householdId, itemId)
  if (existingError) return sendError(response, 500, existingError.message)
  if (!existing) return sendError(response, 404, 'Item not found')

  const item = normalizeItem(request.body, existing)
  const validationError = validateItem(item)
  if (validationError) return sendError(response, 400, validationError)

  if (item.list_id !== existing.list_id) {
    const { data: list, error: listError } = await findList(householdId, item.list_id)
    if (listError) return sendError(response, 500, listError.message)
    if (!list) return sendError(response, 400, 'That list no longer exists')
  }

  // Remember who finished it and when; reopening clears both
  const wasDone = isDone(existing)
  const nowDone = isDone(item)
  const doneFields = nowDone === wasDone
    ? {}
    : nowDone
      ? { done_by_member_id: request.householdMember.household_member_id, done_at_utc: new Date().toISOString() }
      : { done_by_member_id: null, done_at_utc: null }

  const { data, error } = await supabase
    .from('shopping_items')
    .update({ ...item, ...doneFields, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .is('deleted_at_utc', null)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.json(data)
})

router.delete(`${base}/shopping-items/:itemId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('shopping_items')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', request.params.householdId)
    .eq('item_id', request.params.itemId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

// Clears a list's finished items (bought and sold)
router.post(`${base}/shopping-lists/:listId/clear-done`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, listId } = request.params
  const { error } = await supabase
    .from('shopping_items')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('list_id', listId)
    .in('status', Object.values(DONE_STATUS))
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

export default router
