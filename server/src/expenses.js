import { supabase } from './supabase.js'
import { dueOccurrences, FREQUENCIES, isDateString, nextDueDateAfter, todayUtc } from './recurring.js'

// Accepts 'YYYY-MM-DD' or an ISO timestamp (older app versions send one) and keeps only the date
const toDateOnly = (value) => (typeof value === 'string' ? value.slice(0, 10) : value)

export const normalizeExpense = (body) => ({
  household_id: body.householdId,
  category_id: body.categoryId,
  amount: body.amount,
  tag: body.tag || null,
  description: body.description || null,
  expense_date: toDateOnly(body.expenseDate || body.date),
  paid_by_member_id: body.paidByMemberId,
  split_type: body.splitType,
  is_recurring: body.isRecurring ?? false,
  recurring_frequency: body.isRecurring ? body.recurringFrequency : null,
  // The server owns the schedule: the first repeat is one period after the expense date
  next_due_date: body.isRecurring && isDateString(toDateOnly(body.expenseDate || body.date)) && FREQUENCIES.includes(body.recurringFrequency)
    ? nextDueDateAfter(toDateOnly(body.expenseDate || body.date), body.recurringFrequency)
    : null,
})

// Creates every occurrence of the household's recurring expenses that is due by today, then moves
// each next_due_date forward. Safe to run repeatedly or concurrently: the unique
// (recurring_source_id, expense_date) constraint stops duplicates.
export const generateDueRecurringExpenses = async (householdId) => {
  const today = todayUtc()
  const { data: recurringExpenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_recurring', true)
    .is('deleted_at_utc', null)
    .lte('next_due_date', today)

  if (error) throw error

  for (const source of recurringExpenses) {
    const { dates, nextDueDate } = dueOccurrences({
      anchor: source.expense_date,
      frequency: source.recurring_frequency,
      nextDueDate: source.next_due_date,
      today,
    })

    if (dates.length) {
      const { error: insertError } = await supabase
        .from('expenses')
        .upsert(dates.map((date) => ({
          household_id: source.household_id,
          category_id: source.category_id,
          amount: source.amount,
          tag: source.tag,
          description: source.description,
          paid_by_member_id: source.paid_by_member_id,
          split_type: source.split_type,
          expense_date: date,
          recurring_source_id: source.expense_id,
        })), { onConflict: 'recurring_source_id,expense_date', ignoreDuplicates: true })

      if (insertError) throw insertError
    }

    const { error: advanceError } = await supabase
      .from('expenses')
      .update({ next_due_date: nextDueDate })
      .eq('expense_id', source.expense_id)
      .eq('next_due_date', source.next_due_date)

    if (advanceError) throw advanceError
  }
}

export const validateExpense = (expense) => {
  if (!expense.household_id || !expense.category_id || !expense.paid_by_member_id) {
    return 'householdId, categoryId, and paidByMemberId are required'
  }

  if (!Number.isFinite(Number(expense.amount)) || Number(expense.amount) <= 0) {
    return 'amount must be greater than zero'
  }

  if (!expense.expense_date || !expense.split_type) {
    return 'date and splitType are required'
  }

  if (!isDateString(expense.expense_date)) {
    return 'date must be in YYYY-MM-DD format'
  }

  if (!['one', 'split'].includes(expense.split_type)) {
    return 'splitType must be one or split'
  }

  if (expense.is_recurring && !FREQUENCIES.includes(expense.recurring_frequency)) {
    return 'recurringFrequency must be weekly, monthly, or yearly'
  }

  return null
}
