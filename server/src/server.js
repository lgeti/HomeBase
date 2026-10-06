import 'dotenv/config'
import crypto from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'

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
  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('auth_user_id', request.user.id)
    .eq('status', 'active')
    .order('created_at_utc', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) return sendError(response, 500, membershipError.message)
  if (!membership) return response.json(null)

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('*')
    .eq('household_id', membership.household_id)
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
      invited_email: index === 0 ? null : null,
    })))
    .select()

  if (memberError) {
    await supabase.from('households').delete().eq('household_id', household.household_id)
    return sendError(response, 400, memberError.message)
  }

  response.status(201).json({ ...household, members: createdMembers })
})

app.post('/api/households/:householdId/invitations', requireAuth, requireHouseholdMember, async (request, response) => {
  const { email, role = 'member' } = request.body

  if (!email || !['admin', 'member'].includes(role)) {
    return sendError(response, 400, 'email and valid role are required')
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const token = crypto.randomUUID()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

  const { data: existingMember, error: existingMemberError } = await supabase
    .from('household_members')
    .select('household_member_id')
    .eq('household_id', request.params.householdId)
    .eq('invited_email', normalizedEmail)
    .neq('status', 'removed')
    .maybeSingle()

  if (existingMemberError) {
    return sendError(response, 500, existingMemberError.message)
  }

  if (existingMember) {
    return sendError(response, 409, 'An invitation already exists for this email in this household')
  }

  const { data: invitation, error: inviteError } = await supabase
    .from('household_invitations')
    .insert({
      household_id: request.params.householdId,
      invited_email: normalizedEmail,
      invited_role: role,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (inviteError) {
    return sendError(response, 400, inviteError.message)
  }

  response.status(201).json({
    invitationId: invitation.invitation_id,
    email: normalizedEmail,
    role,
    expiresAt,
    inviteToken: token,
  })
})

app.post('/api/invitations/:token/accept', requireAuth, async (request, response) => {
  const token = request.params.token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const { data: invitation, error: inviteError } = await supabase
    .from('household_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .is('accepted_at', null)
    .is('revoked_at', null)
    .maybeSingle()

  if (inviteError) {
    return sendError(response, 500, inviteError.message)
  }

  if (!invitation) {
    return sendError(response, 400, 'Invitation is invalid, expired, or already used')
  }

  const { data: member, error: memberLookupError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', invitation.household_id)
    .eq('invited_email', invitation.invited_email)
    .neq('status', 'removed')
    .maybeSingle()

  if (memberLookupError) {
    return sendError(response, 500, memberLookupError.message)
  }

  if (!member) {
    return sendError(response, 404, 'No pending household member record found for this invitation')
  }

  const { data: updatedMember, error: updateError } = await supabase
    .from('household_members')
    .update({
      auth_user_id: request.user.id,
      role: invitation.invited_role,
      status: 'active',
      invited_email: invitation.invited_email,
      accepted_at: new Date().toISOString(),
    })
    .eq('household_member_id', member.household_member_id)
    .select()
    .single()

  if (updateError) {
    return sendError(response, 400, updateError.message)
  }

  await supabase
    .from('household_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('invitation_id', invitation.invitation_id)

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

// Remove a member from a household by setting their status to 'removed' - needs authentication
app.delete('/api/households/:householdId/members/:memberId', requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('household_members')
    .update({ status: 'removed' })
    .eq('household_id', request.params.householdId)
    .eq('household_member_id', request.params.memberId)
    .neq('status', 'removed')

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