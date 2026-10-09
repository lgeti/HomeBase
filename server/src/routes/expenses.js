import express from 'express'
import { generateDueRecurringExpenses, normalizeExpense, validateExpense } from '../expenses.js'
import { sendError } from '../http.js'
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

  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Update an existing expense for a household - needs authentication
router.patch('/api/households/:householdId/expenses/:expenseId', requireAuth, requireHouseholdMember, async (request, response) => {
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
