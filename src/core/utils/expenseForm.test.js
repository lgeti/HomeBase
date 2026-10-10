import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formDataToExpense, initialFormData } from './expenseForm.js'

const expense = {
  id: 'e1',
  categoryId: 'utilities',
  amount: 42.5,
  tag: 'Internet',
  description: undefined,
  date: '2026-09-03',
  paidByMemberId: 'm2',
  splitType: 'split',
  isRecurring: true,
  recurringFrequency: 'yearly',
  nextDueDate: '2027-09-03',
  isAutoAdded: false,
}

describe('initialFormData', () => {
  it('starts a new expense with the given category, payer and date', () => {
    const form = initialFormData({ categoryId: 'transport', payerId: 'm1', today: '2026-10-11' })
    assert.equal(form.amount, '')
    assert.equal(form.categoryId, 'transport')
    assert.equal(form.paidByMemberId, 'm1')
    assert.equal(form.date, '2026-10-11')
    assert.equal(form.isRecurring, false)
    assert.equal(form.recurringFrequency, 'monthly')
  })

  it('fills the form from an existing expense', () => {
    assert.deepEqual(initialFormData({ expense, categoryId: 'groceries', payerId: 'm1' }), {
      amount: '42.5',
      categoryId: 'utilities',
      tag: 'Internet',
      description: '',
      date: '2026-09-03',
      paidByMemberId: 'm2',
      splitType: 'split',
      isRecurring: true,
      recurringFrequency: 'yearly',
    })
  })

  it('defaults the frequency for an expense that does not repeat', () => {
    const form = initialFormData({ expense: { ...expense, isRecurring: false, recurringFrequency: undefined } })
    assert.equal(form.isRecurring, false)
    assert.equal(form.recurringFrequency, 'monthly')
  })
})

describe('formDataToExpense', () => {
  it('round-trips an existing expense into the full body the API expects', () => {
    assert.deepEqual(formDataToExpense(initialFormData({ expense })), {
      categoryId: 'utilities',
      amount: 42.5,
      tag: 'Internet',
      description: undefined,
      date: '2026-09-03',
      paidByMemberId: 'm2',
      splitType: 'split',
      isRecurring: true,
      recurringFrequency: 'yearly',
    })
  })

  it('stops repeating when the box is unticked', () => {
    const form = { ...initialFormData({ expense }), isRecurring: false }
    assert.equal(formDataToExpense(form).isRecurring, false)
  })
})
