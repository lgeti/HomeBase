// Date math on 'YYYY-MM-DD' strings, done in UTC so results never shift with the timezone

const toUtcDay = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

// Whole days from `today` to `dateString`; negative when it is in the past
export const daysUntil = (dateString, today) => Math.round((toUtcDay(dateString) - toUtcDay(today)) / 86400000)

export const addDays = (dateString, days) => new Date(toUtcDay(dateString) + days * 86400000).toISOString().slice(0, 10)

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const weekdayName = (dateString) => WEEKDAYS[new Date(toUtcDay(dateString)).getUTCDay()]
