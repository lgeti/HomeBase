import express from 'express'
import { sendError } from '../http.js'
import { DEFAULT_GROUPS, normalizeInventoryItem, validateInventoryItem } from '../inventory.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { normalizeListName, validateListName } from '../shopping.js'
import { supabase } from '../supabase.js'

const router = express.Router()
const base = '/api/households/:householdId'

// Unique index on (household, lower(name)) among groups that are not deleted
const isDuplicateName = (error) => error?.code === '23505'
const DUPLICATE_NAME = 'There is already a group with that name'
// Group names follow the same rules as shopping list names
const groupNameError = (name) => validateListName(name)?.replace(/list/g, 'group').replace(/List/g, 'Group') || null

const findGroup = (householdId, groupId) =>
  supabase
    .from('inventory_groups')
    .select('group_id')
    .eq('household_id', householdId)
    .eq('group_id', groupId)
    .is('deleted_at_utc', null)
    .maybeSingle()

// The household's groups in order. A household with none gets Appliances, Bathroom and Cleaning.
router.get(`${base}/inventory-groups`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId } = request.params
  const selectGroups = () =>
    supabase
      .from('inventory_groups')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at_utc', null)
      .order('sort_order', { ascending: true })
      .order('created_at_utc', { ascending: true })

  let { data, error } = await selectGroups()
  if (error) return sendError(response, 500, error.message)

  if (data.length === 0) {
    for (const [index, name] of DEFAULT_GROUPS.entries()) {
      const { error: insertError } = await supabase
        .from('inventory_groups')
        .insert({ household_id: householdId, name, sort_order: index })
      // Two first visits at once: the other one already created it
      if (insertError && !isDuplicateName(insertError)) return sendError(response, 500, insertError.message)
    }
    ;({ data, error } = await selectGroups())
    if (error) return sendError(response, 500, error.message)
  }

  response.json(data)
})

router.post(`${base}/inventory-groups`, requireAuth, requireHouseholdMember, async (request, response) => {
  const name = normalizeListName(request.body.name)
  const validationError = groupNameError(name)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('inventory_groups')
    .insert({ household_id: request.params.householdId, name, sort_order: 100 })
    .select()
    .single()

  if (isDuplicateName(error)) return sendError(response, 409, DUPLICATE_NAME)
  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Rename a group
router.patch(`${base}/inventory-groups/:groupId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, groupId } = request.params
  const name = normalizeListName(request.body.name)
  const validationError = groupNameError(name)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('inventory_groups')
    .update({ name, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('group_id', groupId)
    .is('deleted_at_utc', null)
    .select()
    .maybeSingle()

  if (isDuplicateName(error)) return sendError(response, 409, DUPLICATE_NAME)
  if (error) return sendError(response, 400, error.message)
  if (!data) return sendError(response, 404, 'Group not found')
  response.json(data)
})

// Soft delete: the group and its items stay in the database but are hidden
router.delete(`${base}/inventory-groups/:groupId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('inventory_groups')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', request.params.householdId)
    .eq('group_id', request.params.groupId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

// Every item in the household's groups, by name
router.get(`${base}/inventory-items`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, inventory_groups!inner(deleted_at_utc)')
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)
    .is('inventory_groups.deleted_at_utc', null)
    .order('name', { ascending: true })

  if (error) return sendError(response, 500, error.message)
  response.json(data.map(({ inventory_groups: _group, ...item }) => item))
})

router.post(`${base}/inventory-items`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId } = request.params
  const item = normalizeInventoryItem(request.body)
  const validationError = validateInventoryItem(item)
  if (validationError) return sendError(response, 400, validationError)

  const { data: group, error: groupError } = await findGroup(householdId, item.group_id)
  if (groupError) return sendError(response, 500, groupError.message)
  if (!group) return sendError(response, 400, 'That group no longer exists')

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ ...item, household_id: householdId, added_by_member_id: request.householdMember.household_member_id })
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Accepts any subset of the fields
router.patch(`${base}/inventory-items/:itemId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, itemId } = request.params

  const { data: existing, error: existingError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .is('deleted_at_utc', null)
    .maybeSingle()

  if (existingError) return sendError(response, 500, existingError.message)
  if (!existing) return sendError(response, 404, 'Item not found')

  const item = normalizeInventoryItem(request.body, existing)
  const validationError = validateInventoryItem(item)
  if (validationError) return sendError(response, 400, validationError)

  if (item.group_id !== existing.group_id) {
    const { data: group, error: groupError } = await findGroup(householdId, item.group_id)
    if (groupError) return sendError(response, 500, groupError.message)
    if (!group) return sendError(response, 400, 'That group no longer exists')
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .update({ ...item, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('item_id', itemId)
    .is('deleted_at_utc', null)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.json(data)
})

router.delete(`${base}/inventory-items/:itemId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('inventory_items')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', request.params.householdId)
    .eq('item_id', request.params.itemId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

export default router
