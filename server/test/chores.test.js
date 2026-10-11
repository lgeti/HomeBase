import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isRealDate, nextDueOn, normalizeChore, validateChore } from '../src/chores.js'

describe('nextDueOn', () => {
  it('finishes a one-time chore', () => {
    assert.equal(nextDueOn({ startsOn: '2026-10-11', frequency: 'once', dueOn: '2026-10-11', doneOn: '2026-10-11' }), null)
  })

  describe('by default, counting from the day it was done', () => {
    const chore = { startsOn: '2026-10-01', fixedSchedule: false, dueOn: '2026-10-15' }

    it('moves a chore done early to one period after that day', () => {
      assert.equal(nextDueOn({ ...chore, frequency: 'daily', doneOn: '2026-10-11' }), '2026-10-12')
      assert.equal(nextDueOn({ ...chore, frequency: 'weekly', doneOn: '2026-10-11' }), '2026-10-18')
      assert.equal(nextDueOn({ ...chore, frequency: 'monthly', doneOn: '2026-10-11' }), '2026-11-11')
    })

    it('moves a chore done late the same way', () => {
      assert.equal(nextDueOn({ ...chore, frequency: 'weekly', doneOn: '2026-10-20' }), '2026-10-27')
    })

    it('ends short months at the month end', () => {
      assert.equal(nextDueOn({ ...chore, frequency: 'monthly', doneOn: '2026-01-31' }), '2026-02-28')
    })
  })

  describe('on a fixed day', () => {
    it('moves a daily chore to the day after it was due or done', () => {
      const chore = { startsOn: '2026-10-01', frequency: 'daily', fixedSchedule: true }
      assert.equal(nextDueOn({ ...chore, dueOn: '2026-10-11', doneOn: '2026-10-11' }), '2026-10-12')
      assert.equal(nextDueOn({ ...chore, dueOn: '2026-10-08', doneOn: '2026-10-11' }), '2026-10-12')
      assert.equal(nextDueOn({ ...chore, dueOn: '2026-10-12', doneOn: '2026-10-11' }), '2026-10-13')
    })

    it('keeps a weekly chore on its weekday, done early or late', () => {
      const chore = { startsOn: '2026-10-05', frequency: 'weekly', fixedSchedule: true, dueOn: '2026-10-12' }
      assert.equal(nextDueOn({ ...chore, doneOn: '2026-10-12' }), '2026-10-19')
      assert.equal(nextDueOn({ ...chore, doneOn: '2026-10-10' }), '2026-10-19')
      assert.equal(nextDueOn({ ...chore, doneOn: '2026-10-14' }), '2026-10-19')
    })

    it('skips missed weeks instead of piling them up', () => {
      const chore = { startsOn: '2026-09-07', frequency: 'weekly', fixedSchedule: true, dueOn: '2026-09-14' }
      assert.equal(nextDueOn({ ...chore, doneOn: '2026-10-11' }), '2026-10-12')
    })

    it('keeps a monthly chore at the end of short months', () => {
      const chore = { startsOn: '2026-01-31', frequency: 'monthly', fixedSchedule: true }
      assert.equal(nextDueOn({ ...chore, dueOn: '2026-01-31', doneOn: '2026-01-31' }), '2026-02-28')
      assert.equal(nextDueOn({ ...chore, dueOn: '2026-02-28', doneOn: '2026-02-28' }), '2026-03-31')
    })
  })
})

describe('normalizeChore', () => {
  it('starts the schedule on the first due date', () => {
    const chore = normalizeChore({ name: ' Vacuum ', frequency: 'weekly', dueOn: '2026-10-12', assigneeMemberId: '' })
    assert.deepEqual(chore, {
      name: 'Vacuum',
      note: null,
      assignee_member_id: null,
      frequency: 'weekly',
      fixed_schedule: false,
      due_on: '2026-10-12',
      starts_on: '2026-10-12',
    })
    assert.equal(validateChore(chore), null)
  })

  const existing = {
    name: 'Bins', note: null, assignee_member_id: 'm1', frequency: 'weekly', fixed_schedule: true, due_on: '2026-10-19', starts_on: '2026-10-05',
  }

  it('keeps the schedule when only other fields change', () => {
    assert.deepEqual(normalizeChore({ name: 'Take out bins', assigneeMemberId: null }, existing), {
      ...existing, name: 'Take out bins', assignee_member_id: null,
    })
  })

  it('restarts the schedule from a new due date or frequency', () => {
    assert.equal(normalizeChore({ dueOn: '2026-10-21' }, existing).starts_on, '2026-10-21')
    assert.equal(normalizeChore({ frequency: 'monthly' }, existing).starts_on, '2026-10-19')
    assert.equal(normalizeChore({ fixedSchedule: false }, existing).starts_on, '2026-10-19')
  })
})

describe('validateChore', () => {
  const valid = { name: 'Vacuum', note: null, frequency: 'weekly', due_on: '2026-10-12' }

  it('requires a name, a known frequency and a real date', () => {
    assert.match(validateChore({ ...valid, name: '' }), /Enter a chore/)
    assert.match(validateChore({ ...valid, frequency: 'yearly' }), /frequency/)
    assert.match(validateChore({ ...valid, due_on: '2026-02-30' }), /real date/)
    assert.match(validateChore({ ...valid, due_on: undefined }), /real date/)
  })

  it('accepts leap days only in leap years', () => {
    assert.equal(isRealDate('2028-02-29'), true)
    assert.equal(isRealDate('2026-02-29'), false)
  })
})
