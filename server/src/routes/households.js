import express from 'express'
import { canRemoveMember } from '../authorization.js'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { supabase } from '../supabase.js'

const router = express.Router()

router.get('/api/households/me', requireAuth, async (request, response) => {
  let householdId = null

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('auth_user_id', request.user.id)
    .eq('status', 'active')
    .order('created_at_utc', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) return sendError(response, 500, membershipError.message)

  if (membership) {
    householdId = membership.household_id
  } else {
    const { data: ownerHousehold, error: ownerHouseholdError } = await supabase
      .from('households')
      .select('household_id')
      .eq('owner_user_id', request.user.id)
      .order('created_at_utc', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (ownerHouseholdError) return sendError(response, 500, ownerHouseholdError.message)
    householdId = ownerHousehold?.household_id || null
  }

  if (!householdId) return response.json(null)

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('*')
    .eq('household_id', householdId)
    .single()

  if (householdError) return sendError(response, 500, householdError.message)

  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', household.household_id)
    .neq('status', 'removed')
    .order('display_name')

  if (membersError) return sendError(response, 500, membersError.message)

  response.json({ ...household, members })
})

// Create a household, including the owner and any additional members - authenticated user is the source of truth
router.post('/api/households', requireAuth, async (request, response) => {
  const { name, ownerName, members = [] } = request.body
  const ownerUserId = request.user.id

  if (!name || !ownerName || !Array.isArray(members)) {
    return sendError(response, 400, 'name, ownerName, and members are required')
  }

  const trimmedOwnerName = String(ownerName).trim()
  const uniqueMembers = [...new Set(members.map((member) => String(member).trim()).filter(Boolean))]
  const allNames = [trimmedOwnerName, ...uniqueMembers]

  if (!trimmedOwnerName || new Set(allNames.map((member) => member.toLowerCase())).size !== allNames.length) {
    return sendError(response, 400, 'member names must be non-empty and different')
  }

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name, owner_user_id: ownerUserId })
    .select()
    .single()

  if (householdError) return sendError(response, 400, householdError.message)

  const { data: createdMembers, error: memberError } = await supabase
    .from('household_members')
    .insert(allNames.map((displayName, index) => ({
      household_id: household.household_id,
      display_name: displayName,
      auth_user_id: index === 0 ? ownerUserId : null,
      role: index === 0 ? 'owner' : 'member',
      status: index === 0 ? 'active' : 'pending',
    })))
    .select()

  if (memberError) {
    await supabase.from('households').delete().eq('household_id', household.household_id)
    return sendError(response, 400, memberError.message)
  }

  response.status(201).json({ ...household, members: createdMembers })
})

// Get all members of a household, excluding those with status 'removed' - needs authentication
router.get('/api/households/:householdId/members', requireAuth, requireHouseholdMember, async (request, response) => {
  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', request.params.householdId)
    .neq('status', 'removed')
    .order('display_name')

  if (error) return sendError(response, 500, error.message)
  response.json(data)
})

// Change your own display name in a household
router.patch('/api/households/:householdId/members/me', requireAuth, requireHouseholdMember, async (request, response) => {
  const displayName = String(request.body.displayName || '').trim()

  if (displayName.length < 1 || displayName.length > 100) {
    return sendError(response, 400, 'displayName must be between 1 and 100 characters')
  }

  const { data, error } = await supabase
    .from('household_members')
    .update({ display_name: displayName, updated_at_utc: new Date().toISOString() })
    .eq('household_member_id', request.householdMember.household_member_id)
    .select()
    .single()

  // 23505 = unique violation: names must be unique within a household
  if (error?.code === '23505') return sendError(response, 409, 'Someone in this household already uses that name')
  if (error) return sendError(response, 400, error.message)
  response.json(data)
})

// Remove a member from a household by setting their status to 'removed' - owners and admins only, never the owner
router.delete('/api/households/:householdId/members/:memberId', requireAuth, requireHouseholdMember, async (request, response) => {
  const { data: target, error: targetError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', request.params.householdId)
    .eq('household_member_id', request.params.memberId)
    .neq('status', 'removed')
    .maybeSingle()

  if (targetError) return sendError(response, 500, targetError.message)
  if (!target) return sendError(response, 404, 'Member not found')

  if (!canRemoveMember(request.householdMember, target)) {
    return sendError(response, 403, 'Forbidden: your role cannot remove this member')
  }

  const { error } = await supabase
    .from('household_members')
    .update({ status: 'removed' })
    .eq('household_id', request.params.householdId)
    .eq('household_member_id', target.household_member_id)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

export default router
