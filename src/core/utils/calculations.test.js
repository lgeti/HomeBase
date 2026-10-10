import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calculateBalance,
  formatDate,
  getCategoryTotal,
  getMonthCategoryBreakdown,
  getMonthTotal,
  getMemberName,
  getMemberSummary,
  getMonthExpenses,
  parseLocalDate,
  todayDateString,
} from './calculations.js'

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

describe('payers are matched by member id', () => {
  const members = [
    { household_member_id: 'm-ana', display_name: 'Ana' },
    { household_member_id: 'm-bor', display_name: 'Bor' },
  ]
  const expenses = [
    { date: '2026-10-02', amount: 100, paidByMemberId: 'm-ana', splitType: 'split' },
    { date: '2026-10-03', amount: 30, paidByMemberId: 'm-bor', splitType: 'one' },
  ]

  it('names the payer from the member list', () => {
    assert.equal(getMemberName(members, 'm-bor'), 'Bor')
  })

  it('labels a payer who left the household instead of showing an id', () => {
    assert.equal(getMemberName(members, 'm-gone'), 'Removed member')
  })

  it('keeps totals when a member is renamed', () => {
    const renamed = [{ ...members[0], display_name: 'Ana Novak' }, members[1]]
    const summary = getMemberSummary(expenses, renamed, 2026, 9)
    assert.deepEqual(summary['m-ana'], { name: 'Ana Novak', paid: 100, owed: 50, net: 50 })
    assert.deepEqual(summary['m-bor'], { name: 'Bor', paid: 30, owed: 80, net: -50 })
  })

  it('reports who owes whom by name', () => {
    assert.deepEqual(calculateBalance(expenses, members, 2026, 9), { owes: 'Bor', owed: 'Ana', amount: 50 })
  })
})

describe('split expenses', () => {
  const members = [
    { household_member_id: 'm-ana', display_name: 'Ana' },
    { household_member_id: 'm-bor', display_name: 'Bor' },
    { household_member_id: 'm-cene', display_name: 'Cene' },
  ]
  const expenses = [
    { date: '2026-10-02', amount: 90, categoryId: 'groceries', paidByMemberId: 'm-ana', splitType: 'split' },
    { date: '2026-10-03', amount: 30, categoryId: 'groceries', paidByMemberId: 'm-bor', splitType: 'one' },
    { date: '2026-10-04', amount: 60, categoryId: 'home', paidByMemberId: 'm-bor', splitType: 'split' },
  ]

  it('counts the full amount in the month total', () => {
    assert.equal(getMonthTotal(expenses, 2026, 9), 180)
  })

  it('counts the full amount in the category breakdown', () => {
    assert.deepEqual(getMonthCategoryBreakdown(expenses, 2026, 9), [
      { categoryId: 'groceries', total: 120 },
      { categoryId: 'home', total: 60 },
    ])
  })

  it('makes the month total equal the sum of the category totals', () => {
    const sumOfCategories = getCategoryTotal(expenses, 'groceries') + getCategoryTotal(expenses, 'home')
    assert.equal(getMonthTotal(expenses, 2026, 9), sumOfCategories)
  })

  it('shares a split expense equally between all members', () => {
    const summary = getMemberSummary(expenses, members, 2026, 9)
    // Each split costs everyone a third: 90 / 3 = 30 and 60 / 3 = 20
    assert.deepEqual(summary['m-ana'], { name: 'Ana', paid: 90, owed: 50, net: 40 })
    assert.deepEqual(summary['m-bor'], { name: 'Bor', paid: 90, owed: 80, net: 10 })
    assert.deepEqual(summary['m-cene'], { name: 'Cene', paid: 0, owed: 50, net: -50 })
  })

  it('makes paid and owed add up to the month total', () => {
    const summary = Object.values(getMemberSummary(expenses, members, 2026, 9))
    const total = getMonthTotal(expenses, 2026, 9)
    assert.equal(summary.reduce((sum, member) => sum + member.paid, 0), total)
    assert.equal(summary.reduce((sum, member) => sum + member.owed, 0), total)
  })
})
