import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatDate, getMonthExpenses, parseLocalDate, todayDateString } from './calculations.js'

// West of UTC, new Date('2026-10-01') is still September 30 locally. These tests run there on purpose.
process.env.TZ = 'America/New_York'

describe('parseLocalDate', () => {
  it('keeps the calendar date west of UTC', () => {
    const date = parseLocalDate('2026-10-01')
    assert.equal(date.getFullYear(), 2026)
    assert.equal(date.getMonth(), 9)
    assert.equal(date.getDate(), 1)
  })

  it('accepts an ISO timestamp by using its date part', () => {
    assert.equal(parseLocalDate('2026-10-01T00:00:00.000Z').getDate(), 1)
  })
})

describe('getMonthExpenses', () => {
  it('puts an expense on the 1st in its own month', () => {
    const expenses = [{ date: '2026-10-01' }, { date: '2026-09-30' }]
    assert.deepEqual(getMonthExpenses(expenses, 2026, 9), [{ date: '2026-10-01' }])
  })
})

describe('formatDate', () => {
  it('shows the stored day, not the day before', () => {
    assert.equal(formatDate('2026-10-01'), 'Oct 1, 2026')
  })
})

describe('todayDateString', () => {
  it('uses the local date, not the UTC date', () => {
    // 22:30 on Oct 9 in New York is already Oct 10 in UTC
    assert.equal(todayDateString(new Date(2026, 9, 9, 22, 30)), '2026-10-09')
  })

  it('pads month and day', () => {
    assert.equal(todayDateString(new Date(2026, 0, 5)), '2026-01-05')
  })
})
