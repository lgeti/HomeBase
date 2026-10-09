// Household permission rules. Pure functions so they can be tested without a database.

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

// Owners can invite admins or members; admins can only invite members; members cannot invite.
export const canInvite = (actorRole, invitedRole) => {
  if (actorRole === 'owner') return ['admin', 'member'].includes(invitedRole)
  if (actorRole === 'admin') return invitedRole === 'member'
  return false
}

// The owner can never be removed. Owners can remove anyone else; admins can only remove members.
export const canRemoveMember = (actor, target) => {
  if (!actor || !target) return false
  if (target.role === 'owner') return false
  if (actor.household_member_id === target.household_member_id) return false
  if (actor.role === 'owner') return true
  if (actor.role === 'admin') return target.role === 'member'
  return false
}

// Only the person whose email was invited can accept the invitation.
export const canAcceptInvitation = (user, invitation) => {
  if (!user?.email || !invitation?.invited_email) return false
  return normalizeEmail(user.email) === normalizeEmail(invitation.invited_email)
}
