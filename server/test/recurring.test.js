import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { addPeriods, dueOccurrences, nextDueDateAfter } from '../src/recurring.js'

describe('addPeriods', () => {
  it('adds weeks', () => {
    assert.equal(addPeriods('2026-10-09', 'weekly', 1), '2026-10-16')
    assert.equal(addPeriods('2026-12-28', 'weekly', 1), '2027-01-04')
  })

  it('adds months and clamps to the end of shorter months', () => {
    assert.equal(addPeriods('2026-01-31', 'monthly', 1), '2026-02-28')
    assert.equal(addPeriods('2026-01-31', 'monthly', 2), '2026-03-31')
    assert.equal(addPeriods('2026-01-31', 'monthly', 3), '2026-04-30')
  })

  it('crosses year boundaries', () => {
    assert.equal(addPeriods('2026-11-15', 'monthly', 3), '2027-02-15')
  })

  it('handles leap days for yearly expenses', () => {
    assert.equal(addPeriods('2028-02-29', 'yearly', 1), '2029-02-28')
    assert.equal(addPeriods('2028-02-29', 'yearly', 4), '2032-02-29')
  })
})

describe('nextDueDateAfter', () => {
  it('is one period after the expense date', () => {
    assert.equal(nextDueDateAfter('2026-10-09', 'monthly'), '2026-11-09')
  })
})

describe('dueOccurrences', () => {
  it('returns nothing when the next due date is in the future', () => {
    const result = dueOccurrences({ anchor: '2026-10-01', frequency: 'monthly', nextDueDate: '2026-11-01', today: '2026-10-20' })
    assert.deepEqual(result, { dates: [], nextDueDate: '2026-11-01' })
  })

  it('creates the occurrence due today', () => {
    const result = dueOccurrences({ anchor: '2026-09-09', frequency: 'monthly', nextDueDate: '2026-10-09', today: '2026-10-09' })
    assert.deepEqual(result, { dates: ['2026-10-09'], nextDueDate: '2026-11-09' })
  })

  it('catches up on every missed occurrence', () => {
    const result = dueOccurrences({ anchor: '2026-06-15', frequency: 'monthly', nextDueDate: '2026-07-15', today: '2026-10-09' })
    assert.deepEqual(result, { dates: ['2026-07-15', '2026-08-15', '2026-09-15'], nextDueDate: '2026-10-15' })
  })

  it('skips occurrences that were already created', () => {
    const result = dueOccurrences({ anchor: '2026-06-15', frequency: 'monthly', nextDueDate: '2026-09-15', today: '2026-10-09' })
    assert.deepEqual(result, { dates: ['2026-09-15'], nextDueDate: '2026-10-15' })
  })

  it('keeps end-of-month expenses at the end of the month', () => {
    const result = dueOccurrences({ anchor: '2026-01-31', frequency: 'monthly', nextDueDate: '2026-02-28', today: '2026-04-30' })
    assert.deepEqual(result, { dates: ['2026-02-28', '2026-03-31', '2026-04-30'], nextDueDate: '2026-05-31' })
  })

  it('caps how many occurrences are created at once', () => {
    const result = dueOccurrences({ anchor: '2000-01-01', frequency: 'weekly', nextDueDate: '2000-01-08', today: '2026-10-09' })
    assert.equal(result.dates.length, 400)
    assert.equal(result.nextDueDate, addPeriods('2000-01-01', 'weekly', 401))
  })
})
