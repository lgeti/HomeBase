import express from 'express'
import { normalizeFridgeItem, validateFridgeItem } from '../fridge.js'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { OPEN_STATUS } from '../shopping.js'
import { supabase } from '../supabase.js'

const router = express.Router()
const base = '/api/households/:householdId/fridge-items'

const findItem = (householdId, itemId) =>
  supabase
    .from('fridge_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .is('deleted_at_utc', null)
    .maybeSingle()

// Everything in the fridge, soonest expiry first; items without a date come last
router.get(base, requireAuth, requireHouseholdMember, async (request, response) => {
  const { data, error } = await supabase
    .from('fridge_items')
    .select('*')
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)
    .order('expires_on', { ascending: true, nullsFirst: false })
    .order('created_at_utc', { ascending: true })

  if (error) return sendError(response, 500, error.message)
  response.json(data)
})

router.post(base, requireAuth, requireHouseholdMember, async (request, response) => {
  const item = normalizeFridgeItem(request.body)
  const validationError = validateFridgeItem(item)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('fridge_items')
    .insert({
      ...item,
      household_id: request.params.householdId,
      added_by_member_id: request.householdMember.household_member_id,
    })
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Accepts any subset of the fields
router.patch(`${base}/:itemId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, itemId } = request.params

  const { data: existing, error: existingError } = await findItem(householdId, itemId)
  if (existingError) return sendError(response, 500, existingError.message)
  if (!existing) return sendError(response, 404, 'Item not found')

  const item = normalizeFridgeItem(request.body, existing)
  const validationError = validateFridgeItem(item)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('fridge_items')
    .update({ ...item, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .is('deleted_at_utc', null)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.json(data)
})

// Removes an item that was entered by mistake
router.delete(`${base}/:itemId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('fridge_items')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', request.params.householdId)
    .eq('item_id', request.params.itemId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

// Used up: removes the item, and with { listId } puts it on that shopping list.
// Returns the new shopping item, or null when no list was chosen.
router.post(`${base}/:itemId/used-up`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, itemId } = request.params
  const { listId } = request.body

  const { data: existing, error: existingError } = await findItem(householdId, itemId)
  if (existingError) return sendError(response, 500, existingError.message)
  if (!existing) return sendError(response, 404, 'Item not found')

  // The shopping item comes first, so a failure leaves the fridge item in place to try again
  let shoppingItem = null
  if (listId) {
    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .select('list_id')
      .eq('household_id', householdId)
      .eq('list_id', listId)
      .is('deleted_at_utc', null)
      .maybeSingle()

    if (listError) return sendError(response, 500, listError.message)
    if (!list) return sendError(response, 400, 'That list no longer exists')

    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        household_id: householdId,
        list_id: listId,
        name: existing.name,
        kind: 'buy',
        status: OPEN_STATUS.buy,
        quantity: existing.quantity,
        added_by_member_id: request.householdMember.household_member_id,
      })
      .select()
      .single()

    if (error) return sendError(response, 400, error.message)
    shoppingItem = data
  }

  const { error } = await supabase
    .from('fridge_items')
    .update({ deleted_at_utc: new Date().toISOString(), used_up: true })
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.json({ shoppingItem })
})

export default router
