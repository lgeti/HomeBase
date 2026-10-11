import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { choreFormToBody, dueLabel, groupChores, initialChoreForm, lastDoneLabel, scheduleLabel } from './chores.js'

const today = '2026-10-11' // a Sunday
const chore = (id, dueOn, extra = {}) => ({ id, name: id, dueOn, frequency: 'weekly', ...extra })

describe('groupChores', () => {
  it('splits chores into overdue, today and upcoming, soonest first', () => {
    const chores = [chore('later', '2026-10-20'), chore('now', '2026-10-11'), chore('late', '2026-10-09'), chore('soon', '2026-10-12'), chore('older', '2026-10-01')]
    const { overdue, today: dueToday, upcoming } = groupChores(chores, today)
    assert.deepEqual(overdue.map((c) => c.id), ['older', 'late'])
    assert.deepEqual(dueToday.map((c) => c.id), ['now'])
    assert.deepEqual(upcoming.map((c) => c.id), ['soon', 'later'])
  })
})

describe('dueLabel', () => {
  it('describes how close a chore is', () => {
    assert.equal(dueLabel(chore('a', '2026-10-08'), today), '3 days overdue')
    assert.equal(dueLabel(chore('a', '2026-10-10'), today), 'Was due yesterday')
    assert.equal(dueLabel(chore('a', '2026-10-11'), today), 'Today')
    assert.equal(dueLabel(chore('a', '2026-10-12'), today), 'Tomorrow')
    assert.equal(dueLabel(chore('a', '2026-10-16'), today), 'Friday')
    assert.equal(dueLabel(chore('a', '2026-10-18'), today), '18 Oct')
  })
})

describe('lastDoneLabel', () => {
  const members = [{ household_member_id: 'm1', display_name: 'Ana' }]

  it('names who did it and when', () => {
    assert.equal(lastDoneLabel({ lastDoneByMemberId: 'm1', lastDoneOn: '2026-10-11' }, members, today), 'Last done by Ana today')
    assert.equal(lastDoneLabel({ lastDoneByMemberId: 'm1', lastDoneOn: '2026-10-10' }, members, today), 'Last done by Ana yesterday')
    assert.equal(lastDoneLabel({ lastDoneByMemberId: 'm1', lastDoneOn: '2026-10-02' }, members, today), 'Last done by Ana 2 Oct')
    assert.equal(lastDoneLabel({}, members, today), null)
  })
})

describe('chore form', () => {
  it('starts a new chore as weekly from today, for anyone', () => {
    assert.deepEqual(initialChoreForm(undefined, today), {
      name: '', frequency: 'weekly', fixedSchedule: false, dueOn: today, assigneeMemberId: '', note: '',
    })
  })

  it('sends "anyone" as null and trims text', () => {
    const form = { ...initialChoreForm(chore('Bins ', '2026-10-12', { assigneeMemberId: 'm1' }), today), assigneeMemberId: '' }
    assert.deepEqual(choreFormToBody(form), {
      name: 'Bins', frequency: 'weekly', fixedSchedule: false, dueOn: '2026-10-12', assigneeMemberId: null, note: '',
    })
  })

  it('only keeps a fixed day for repeating chores', () => {
    const form = initialChoreForm(chore('Bins', '2026-10-12', { fixedSchedule: true }), today)
    assert.equal(choreFormToBody(form).fixedSchedule, true)
    assert.equal(choreFormToBody({ ...form, frequency: 'once' }).fixedSchedule, false)
  })
})

describe('scheduleLabel', () => {
  it('mentions a fixed day', () => {
    assert.equal(scheduleLabel(chore('a', today)), 'Every week')
    assert.equal(scheduleLabel(chore('a', today, { fixedSchedule: true })), 'Every week · Fixed day')
    assert.equal(scheduleLabel(chore('a', today, { frequency: 'once', fixedSchedule: true })), 'One time')
  })
})
