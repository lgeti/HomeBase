// Recurring expense date math. Dates are 'YYYY-MM-DD' strings handled in UTC so results never shift by timezone.
// Pure functions so they can be tested without a database.

export const FREQUENCIES = ['weekly', 'monthly', 'yearly']

export const isDateString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

// Safety cap on how many missed occurrences are created in one go (about 8 years of weekly expenses)
const MAX_OCCURRENCES = 400

const toDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const toDateString = (date) => date.toISOString().slice(0, 10)

const daysInMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

// The n-th occurrence after `anchor`. Months and years are counted from the anchor and clamped to the
// end of the month, so Jan 31 monthly gives Feb 28, Mar 31, Apr 30 instead of drifting.
export const addPeriods = (anchor, frequency, count) => {
  const date = toDate(anchor)

  if (frequency === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7 * count)
    return toDateString(date)
  }

  const months = frequency === 'yearly' ? 12 * count : count
  const year = date.getUTCFullYear() + Math.floor((date.getUTCMonth() + months) / 12)
  const monthIndex = (date.getUTCMonth() + months) % 12
  const day = Math.min(date.getUTCDate(), daysInMonth(year, monthIndex))
  return toDateString(new Date(Date.UTC(year, monthIndex, day)))
}

export const nextDueDateAfter = (anchor, frequency) => addPeriods(anchor, frequency, 1)

// Dates from `nextDueDate` up to and including `today` that still need an expense,
// plus the next due date after them.
export const dueOccurrences = ({ anchor, frequency, nextDueDate, today }) => {
  const dates = []
  let count = 1
  let candidate = addPeriods(anchor, frequency, count)

  while (candidate <= today && dates.length < MAX_OCCURRENCES) {
    if (candidate >= nextDueDate) dates.push(candidate)
    count += 1
    candidate = addPeriods(anchor, frequency, count)
  }

  return { dates, nextDueDate: dates.length ? candidate : nextDueDate }
}

export const todayUtc = () => toDateString(new Date())
