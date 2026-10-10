import express from 'express'
import { generateDueRecurringExpenses, normalizeExpense, validateExpense } from '../expenses.js'
import { sendError } from '../http.js'
import { nextDueDateAfterEdit, todayUtc } from '../recurring.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { supabase } from '../supabase.js'

const router = express.Router()

// Expense endpoints - needs authentication
router.get('/api/households/:householdId/expenses', requireAuth, requireHouseholdMember, async (request, response) => {
  // A failure here should not hide existing expenses, so it is logged instead of returned
  try {
    await generateDueRecurringExpenses(request.params.householdId)
  } catch (generationError) {
    console.error('Recurring expense generation failed:', generationError.message)
  }

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
router.post('/api/households/:householdId/expenses', requireAuth, requireHouseholdMember, async (request, response) => {
  const expense = normalizeExpense({ ...request.body, householdId: request.params.householdId })
  const validationError = validateExpense(expense)
  if (validationError) return sendError(response, 400, validationError)

  // Only members who have joined can pay for expenses
  const { data: payer, error: payerError } = await supabase
    .from('household_members')
    .select('household_member_id')
    .eq('household_id', request.params.householdId)
    .eq('household_member_id', expense.paid_by_member_id)
    .eq('status', 'active')
    .maybeSingle()

  if (payerError) return sendError(response, 500, payerError.message)
  if (!payer) return sendError(response, 400, 'The payer must be a member who has joined this household')

  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Update an existing expense for a household - needs authentication. Takes the full expense, like create.
router.patch('/api/households/:householdId/expenses/:expenseId', requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, expenseId } = request.params
  const updates = normalizeExpense({ ...request.body, householdId })
  delete updates.household_id
  const validationError = validateExpense({ ...updates, household_id: householdId })
  if (validationError) return sendError(response, 400, validationError)

  const { data: existing, error: existingError } = await supabase
    .from('expenses')
    .select('*')
    .eq('expense_id', expenseId)
    .eq('household_id', householdId)
    .is('deleted_at_utc', null)
    .maybeSingle()

  if (existingError) return sendError(response, 500, existingError.message)
  if (!existing) return sendError(response, 404, 'Expense not found')

  // An automatically added repeat would start a second schedule; the original expense owns it
  if (existing.recurring_source_id && updates.is_recurring) {
    return sendError(response, 400, 'An automatically added expense cannot repeat; edit the original instead')
  }

  // Only members who have joined can pay for expenses; an older expense may keep a payer who has left
  if (updates.paid_by_member_id !== existing.paid_by_member_id) {
    const { data: payer, error: payerError } = await supabase
      .from('household_members')
      .select('household_member_id')
      .eq('household_id', householdId)
      .eq('household_member_id', updates.paid_by_member_id)
      .eq('status', 'active')
      .maybeSingle()

    if (payerError) return sendError(response, 500, payerError.message)
    if (!payer) return sendError(response, 400, 'The payer must be a member who has joined this household')
  }

  // Repeats already added (deleted ones too, as they still block their dates) must not come back on new dates
  let hasRepeats = false
  if (updates.is_recurring) {
    const { count, error: repeatsError } = await supabase
      .from('expenses')
      .select('expense_id', { count: 'exact', head: true })
      .eq('recurring_source_id', expenseId)

    if (repeatsError) return sendError(response, 500, repeatsError.message)
    hasRepeats = count > 0
  }

  updates.next_due_date = nextDueDateAfterEdit({
    before: {
      isRecurring: existing.is_recurring,
      date: existing.expense_date,
      frequency: existing.recurring_frequency,
      nextDueDate: existing.next_due_date,
    },
    after: { isRecurring: updates.is_recurring, date: updates.expense_date, frequency: updates.recurring_frequency },
    hasRepeats,
    today: todayUtc(),
  })

  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('expense_id', expenseId)
    .eq('household_id', householdId)
    .is('deleted_at_utc', null)
    .select()
    .single()

  // Unique (recurring_source_id, expense_date): another repeat of the same expense is on that date
  if (error?.code === '23505') return sendError(response, 409, 'This repeating expense already has an entry on that date')
  if (error) return sendError(response, 400, error.message)
  response.json(data)
})

// Delete an existing expense for a household - needs authentication
router.delete('/api/households/:householdId/expenses/:expenseId', requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('expense_id', request.params.expenseId)
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

export default router
