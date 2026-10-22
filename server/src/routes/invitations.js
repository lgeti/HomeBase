import crypto from 'node:crypto'
import express from 'express'
import { canInvite } from '../authorization.js'
import { sendError } from '../http.js'
import { planForRequest, requireAuth, requireHouseholdMember } from '../middleware.js'
import { memberFits, planError, planOf } from '../plans.js'
import { supabase } from '../supabase.js'

const router = express.Router()

// Create an invite link for an existing pending member (memberId) or a new pending member (displayName).
// Whoever opens the link and signs in becomes that member.
router.post('/api/households/:householdId/invitations', requireAuth, requireHouseholdMember, async (request, response) => {
  const { role = 'member', memberId, displayName } = request.body
  const householdId = request.params.householdId

  if (!['admin', 'member'].includes(role)) {
    return sendError(response, 400, 'a valid role is required')
  }

  if (!memberId && !String(displayName || '').trim()) {
    return sendError(response, 400, 'memberId or displayName is required')
  }

  if (!canInvite(request.householdMember.role, role)) {
    return sendError(response, 403, 'Forbidden: your role cannot send this invitation')
  }

  // The plan caps how many people a household can have
  const { data: currentMembers, error: membersError } = await supabase
    .from('household_members')
    .select('status')
    .eq('household_id', householdId)

  if (membersError) return sendError(response, 500, membersError.message)
  const planId = await planForRequest(request)
  if (!memberFits(planId, currentMembers, { existingPending: Boolean(memberId) })) {
    return response.status(402).json(planError.members(planId))
  }

  let member
  if (memberId) {
    const { data, error } = await supabase
      .from('household_members')
      .update({ invited_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('household_member_id', memberId)
      .eq('status', 'pending')
      .select()
      .maybeSingle()

    if (error) return sendError(response, 400, error.message)
    if (!data) return sendError(response, 404, 'No pending member found with this id')
    member = data
  } else {
    const { data, error } = await supabase
      .from('household_members')
      .insert({
        household_id: householdId,
        display_name: String(displayName).trim(),
        role: 'member',
        status: 'pending',
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return sendError(response, 400, error.message)
    member = data
  }

  // Only the newest link for a member stays usable
  const { error: revokeError } = await supabase
    .from('household_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('household_member_id', member.household_member_id)
    .is('accepted_at', null)
    .is('revoked_at', null)

  if (revokeError) return sendError(response, 500, revokeError.message)

  const token = crypto.randomUUID()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

  const { data: invitation, error: inviteError } = await supabase
    .from('household_invitations')
    .insert({
      household_id: householdId,
      household_member_id: member.household_member_id,
      invited_role: role,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (inviteError) return sendError(response, 400, inviteError.message)

  response.status(201).json({
    invitationId: invitation.invitation_id,
    memberId: member.household_member_id,
    role,
    expiresAt,
    inviteToken: token,
  })
})

router.post('/api/invitations/:token/accept', requireAuth, async (request, response) => {
  const tokenHash = crypto.createHash('sha256').update(request.params.token).digest('hex')

  const { data: invitation, error: inviteError } = await supabase
    .from('household_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .is('accepted_at', null)
    .is('revoked_at', null)
    .maybeSingle()

  if (inviteError) return sendError(response, 500, inviteError.message)
  if (!invitation) return sendError(response, 400, 'Invitation is invalid, expired, or already used')

  // The app supports one household per person, so someone who already has a household cannot join this one
  const { data: existingMembership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('auth_user_id', request.user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (membershipError) return sendError(response, 500, membershipError.message)
  if (existingMembership) {
    const message = existingMembership.household_id === invitation.household_id
      ? 'You are already a member of this household'
      : 'You already belong to another household'
    return sendError(response, 409, message)
  }

  // Older links may still be out after the household filled its places, so check again on joining
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('plan, plan_status')
    .eq('household_id', invitation.household_id)
    .single()

  if (householdError) return sendError(response, 500, householdError.message)
  const { data: joinedMembers, error: joinedError } = await supabase
    .from('household_members')
    .select('status')
    .eq('household_id', invitation.household_id)
    .eq('status', 'active')

  if (joinedError) return sendError(response, 500, joinedError.message)
  const planId = planOf(household)
  if (!memberFits(planId, joinedMembers, { existingPending: true })) {
    return response.status(402).json(planError.members(planId))
  }

  // Claim the invitation first so the same token cannot be accepted twice
  const { data: claimed, error: claimError } = await supabase
    .from('household_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('invitation_id', invitation.invitation_id)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .select()
    .maybeSingle()

  if (claimError) return sendError(response, 500, claimError.message)
  if (!claimed) return sendError(response, 400, 'Invitation is invalid, expired, or already used')

  const releaseClaim = () => supabase
    .from('household_invitations')
    .update({ accepted_at: null })
    .eq('invitation_id', invitation.invitation_id)

  const { data: updatedMember, error: updateError } = await supabase
    .from('household_members')
    .update({
      auth_user_id: request.user.id,
      role: invitation.invited_role,
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('household_id', invitation.household_id)
    .eq('household_member_id', invitation.household_member_id)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (updateError) {
    await releaseClaim()
    return sendError(response, 400, updateError.message)
  }

  if (!updatedMember) {
    await releaseClaim()
    return sendError(response, 404, 'No pending household member record found for this invitation')
  }

  response.json({
    householdId: invitation.household_id,
    member: updatedMember,
  })
})

export default router
