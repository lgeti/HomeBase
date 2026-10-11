// Chore helpers: grouping by due date and the labels on each row. `today` is a local 'YYYY-MM-DD'.
import { formatShortDate, getMemberName, parseLocalDate } from '../../core/utils/calculations.js'
import { daysUntil, weekdayName } from '../../core/utils/dates.js'

export const FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const FREQUENCY_LABELS = { once: 'One time', daily: 'Every day', weekly: 'Every week', monthly: 'Every month' }

// Overdue, due today, and upcoming, each soonest first
export const groupChores = (chores, today) => {
  const sorted = [...chores].sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  return {
    overdue: sorted.filter((chore) => chore.dueOn < today),
    today: sorted.filter((chore) => chore.dueOn === today),
    upcoming: sorted.filter((chore) => chore.dueOn > today),
  }
}

export const dueLabel = (chore, today) => {
  const days = daysUntil(chore.dueOn, today)
  if (days < -1) return `${-days} days overdue`
  if (days === -1) return 'Was due yesterday'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return weekdayName(chore.dueOn)
  return formatShortDate(chore.dueOn, parseLocalDate(today))
}

const relativeDay = (dateString, today) => {
  const days = daysUntil(dateString, today)
  if (days === 0) return 'today'
  if (days === -1) return 'yesterday'
  return formatShortDate(dateString, parseLocalDate(today))
}

// "Last done by Ana yesterday", or null if it was never done
export const lastDoneLabel = (chore, members, today) =>
  chore.lastDoneOn ? `Last done by ${getMemberName(members, chore.lastDoneByMemberId)} ${relativeDay(chore.lastDoneOn, today)}` : null

export const initialChoreForm = (chore, today) => ({
  name: chore?.name ?? '',
  frequency: chore?.frequency ?? 'weekly',
  dueOn: chore?.dueOn ?? today,
  assigneeMemberId: chore?.assigneeMemberId ?? '',
  note: chore?.note ?? '',
})

// Empty optional fields are sent empty so editing can clear them
export const choreFormToBody = (form) => ({
  name: form.name.trim(),
  frequency: form.frequency,
  dueOn: form.dueOn,
  assigneeMemberId: form.assigneeMemberId || null,
  note: form.note.trim(),
})
