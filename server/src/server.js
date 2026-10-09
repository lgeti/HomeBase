import 'dotenv/config'
import crypto from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { canAcceptInvitation, canInvite, canRemoveMember, normalizeEmail } from './authorization.js'

const port = Number(process.env.PORT || 3000)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required')
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const getUserFromToken = async (authorizationHeader) => {
  if (!authorizationHeader?.startsWith('Bearer ')) return null

  const token = authorizationHeader.replace('Bearer ', '').trim()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) return null
  return data.user
}

const requireAuth = async (request, response, next) => {
  const user = await getUserFromToken(request.headers.authorization)
  if (!user) {
    return sendError(response, 401, 'Unauthorized')
  }

  request.user = user
  next()
}

const requireHouseholdMember = async (request, response, next) => {
  const householdId = request.params.householdId
  const userId = request.user.id

  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .eq('auth_user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return sendError(response, 403, 'Forbidden: User is not an active member of this household')
  }

  request.householdMember = data
  next()
}

const app = express()

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

const sendError = (response, status, message) => {
  response.status(status).json({ error: message })
}

const normalizeExpense = (body) => ({
  household_id: body.householdId,
  category_id: body.categoryId,
  amount: body.amount,
  tag: body.tag || null,
  description: body.description || null,
  expense_date: body.expenseDate || body.date,
  paid_by_member_id: body.paidByMemberId,
  split_type: body.splitType,
  is_recurring: body.isRecurring ?? false,
  recurring_frequency: body.isRecurring ? body.recurringFrequency : null,
  next_due_date: body.isRecurring ? body.nextDueDate : null,
})

const validateExpense = (expense) => {
  if (!expense.household_id || !expense.category_id || !expense.paid_by_member_id) {
    return 'householdId, categoryId, and paidByMemberId are required'
  }

  if (!Number.isFinite(Number(expense.amount)) || Number(expense.amount) <= 0) {
    return 'amount must be greater than zero'
  }

  if (!expense.expense_date || !expense.split_type) {
    return 'date and splitType are required'
  }

  if (!['one', 'split'].includes(expense.split_type)) {
    return 'splitType must be one or split'
  }

  if (expense.is_recurring && !['weekly', 'monthly', 'yearly'].includes(expense.recurring_frequency)) {
    return 'recurringFrequency must be weekly, monthly, or yearly'
  }

  if (expense.is_recurring && !expense.next_due_date) {
    return 'nextDueDate is required for recurring expenses'
  }

  return null
}

app.get('/health', (request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/categories', async (request, response) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) return sendError(response, 500, error.message)
  response.json(data)
})

app.get('/api/households/me', requireAuth, async (request, response) => {
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
app.post('/api/households', requireAuth, async (request, response) => {
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

// Invite someone by email - links the invite to an existing pending member (memberId) or creates a new pending member (displayName)
app.post('/api/households/:householdId/invitations', requireAuth, requireHouseholdMember, async (request, response) => {
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

app.post('/api/invitations/:token/accept', requireAuth, async (request, response) => {
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

// Get all members of a household, excluding those with status 'removed' - needs authentication
app.get('/api/households/:householdId/members', requireAuth, requireHouseholdMember, async (request, response) => {
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
app.patch('/api/households/:householdId/members/me', requireAuth, requireHouseholdMember, async (request, response) => {
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
app.delete('/api/households/:householdId/members/:memberId', requireAuth, requireHouseholdMember, async (request, response) => {
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

// Expense endpoints - needs authentication
app.get('/api/households/:householdId/expenses', requireAuth, requireHouseholdMember, async (request, response) => {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)
    .order('expense_date', { ascending: false })

  if (request.query.from) query = query.gte('expense_date', request.query.from)
  if (request.query.to) query = query.lte('expense_date', request.query.to)
  if (request.query.categoryId) query = query.eq('category_id', request.query.categoryId)

  const { data, error } = await query
  if (error) return sendError(response, 500, error.message)
  response.json(data)
})

// Create a new expense for a household - needs authentication
app.post('/api/households/:householdId/expenses', requireAuth, requireHouseholdMember, async (request, response) => {
  const expense = normalizeExpense({ ...request.body, householdId: request.params.householdId })
  const validationError = validateExpense(expense)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Update an existing expense for a household - needs authentication
app.patch('/api/households/:householdId/expenses/:expenseId', requireAuth, requireHouseholdMember, async (request, response) => {
  const updates = normalizeExpense({ ...request.body, householdId: request.params.householdId })
  delete updates.household_id
  const validationError = validateExpense({ ...updates, household_id: request.params.householdId })
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('expense_id', request.params.expenseId)
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.json(data)
})

// Delete an existing expense for a household - needs authentication
app.delete('/api/households/:householdId/expenses/:expenseId', requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('expense_id', request.params.expenseId)
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

app.use((request, response) => {
  sendError(response, 404, 'Route not found')
})

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`)
})