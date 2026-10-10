import crypto from 'node:crypto'
import express from 'express'
import { canAcceptInvitation, canInvite, normalizeEmail } from '../authorization.js'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { supabase } from '../supabase.js'

const router = express.Router()

// Invite someone by email - links the invite to an existing pending member (memberId) or creates a new pending member (displayName)
router.post('/api/households/:householdId/invitations', requireAuth, requireHouseholdMember, async (request, response) => {
  const { email, role = 'member', memberId, displayName } = request.body
  const householdId = request.params.householdId
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail.includes('@') || !['admin', 'member'].includes(role)) {
    return sendError(response, 400, 'a valid email and role are required')
  }

  if (!memberId && !String(displayName || '').trim()) {
    return sendError(response, 400, 'memberId or displayName is required')
  }

  if (!canInvite(request.householdMember.role, role)) {
    return sendError(response, 403, 'Forbidden: your role cannot send this invitation')
  }

  const { data: emailOwner, error: emailOwnerError } = await supabase
    .from('household_members')
    .select('household_member_id')
    .eq('household_id', householdId)
    .eq('invited_email', normalizedEmail)
    .neq('status', 'removed')
    .maybeSingle()

  if (emailOwnerError) return sendError(response, 500, emailOwnerError.message)

  if (emailOwner && emailOwner.household_member_id !== memberId) {
    return sendError(response, 409, 'This email is already invited to another member of this household')
  }

  let member
  if (memberId) {
    const { data, error } = await supabase
      .from('household_members')
      .update({ invited_email: normalizedEmail, invited_at: new Date().toISOString() })
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
        invited_email: normalizedEmail,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return sendError(response, 400, error.message)
    member = data
  }

  // Only the newest invitation for an email stays usable
  const { error: revokeError } = await supabase
    .from('household_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('invited_email', normalizedEmail)
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
      invited_email: normalizedEmail,
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
    email: normalizedEmail,
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

  if (!canAcceptInvitation(request.user, invitation)) {
    return sendError(response, 403, 'Forbidden: this invitation was sent to a different email')
  }

  // The app supports one household per person, so a member of another household cannot join this one
  const { data: existingMembership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('auth_user_id', request.user.id)
    .eq('status', 'active')
    .neq('household_id', invitation.household_id)
    .limit(1)
    .maybeSingle()

  if (membershipError) return sendError(response, 500, membershipError.message)
  if (existingMembership) {
    return sendError(response, 409, 'You already belong to another household')
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
    .eq('invited_email', invitation.invited_email)
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
