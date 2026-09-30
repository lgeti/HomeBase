import 'dotenv/config'
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

app.post('/api/households', async (request, response) => {
  const { name, members = [] } = request.body

  if (!name || !Array.isArray(members) || members.length < 2) {
    return sendError(response, 400, 'name and at least two members are required')
  }

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name })
    .select()
    .single()

  if (householdError) return sendError(response, 400, householdError.message)

  const { data: createdMembers, error: memberError } = await supabase
    .from('household_members')
    .insert(members.map((displayName) => ({ household_id: household.household_id, display_name: displayName })))
    .select()

  if (memberError) {
    await supabase.from('households').delete().eq('household_id', household.household_id)
    return sendError(response, 400, memberError.message)
  }

  response.status(201).json({ ...household, members: createdMembers })
})

app.get('/api/households/:householdId/members', async (request, response) => {
  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', request.params.householdId)
    .order('display_name')

  if (error) return sendError(response, 500, error.message)
  response.json(data)
})

app.get('/api/households/:householdId/expenses', async (request, response) => {
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

app.post('/api/households/:householdId/expenses', async (request, response) => {
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

app.patch('/api/households/:householdId/expenses/:expenseId', async (request, response) => {
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

app.delete('/api/households/:householdId/expenses/:expenseId', async (request, response) => {
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