// Chore rules. Pure functions so they can be tested without a database.
import { addPeriods, isDateString } from './recurring.js'

export const CHORE_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly']

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')
const optionalText = (value) => trimmed(value) || null

const addDays = (dateString, days) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export const isRealDate = (value) => isDateString(value) && addDays(value, 0) === value

// The next due date after a chore is done.
// Usually one period after the day it was done: vacuumed on the 11th, weekly, next on the 18th.
// With a fixed schedule (bin day) it is the first date on its schedule after both the date it was
// due and the day it was done, so it keeps its weekday or day of month, done early or late.
export const nextDueOn = ({ startsOn, frequency, fixedSchedule, dueOn, doneOn }) => {
  if (frequency === 'once') return null
  if (!fixedSchedule) return frequency === 'daily' ? addDays(doneOn, 1) : addPeriods(doneOn, frequency, 1)

  const after = dueOn > doneOn ? dueOn : doneOn
  if (frequency === 'daily') return addDays(after, 1)

  // Weekly and monthly count from startsOn (addPeriods keeps month ends), skipping any missed dates
  let count = 1
  let candidate = addPeriods(startsOn, frequency, count)
  while (candidate <= after) {
    count += 1
    candidate = addPeriods(startsOn, frequency, count)
  }
  return candidate
}

// Builds the columns for a chore from a request body. For an update, `existing` supplies every
// field the body leaves out. A new due date, frequency or schedule type restarts the schedule from that date.
export const normalizeChore = (body, existing = {}) => {
  const has = (key) => Object.hasOwn(body, key)
  const frequency = has('frequency') ? body.frequency : existing.frequency
  const dueOn = has('dueOn') ? trimmed(body.dueOn) : existing.due_on
  const fixedSchedule = has('fixedSchedule') ? Boolean(body.fixedSchedule) : Boolean(existing.fixed_schedule)
  const restartsSchedule = !existing.starts_on
    || dueOn !== existing.due_on
    || frequency !== existing.frequency
    || fixedSchedule !== Boolean(existing.fixed_schedule)

  return {
    name: has('name') ? trimmed(body.name) : existing.name,
    note: has('note') ? optionalText(body.note) : existing.note ?? null,
    assignee_member_id: has('assigneeMemberId') ? body.assigneeMemberId || null : existing.assignee_member_id ?? null,
    frequency,
    fixed_schedule: fixedSchedule,
    due_on: dueOn,
    starts_on: restartsSchedule ? dueOn : existing.starts_on,
  }
}

export const validateChore = (chore) => {
  if (!chore.name) return 'Enter a chore'
  if (chore.name.length > 120) return 'Chores can be at most 120 characters'
  if (chore.note && chore.note.length > 500) return 'Notes can be at most 500 characters'
  if (!CHORE_FREQUENCIES.includes(chore.frequency)) return 'frequency must be once, daily, weekly or monthly'
  if (!isRealDate(chore.due_on)) return 'Due date must be a real date in YYYY-MM-DD format'
  return null
}
