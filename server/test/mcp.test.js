import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer, summarizeMonth } from '../src/mcp.js'

const householdId = '11111111-1111-1111-1111-111111111111'
const members = [
  { household_member_id: 'm1', display_name: 'Daniel', status: 'active', auth_user_id: 'u1' },
  { household_member_id: 'm2', display_name: 'Carol', status: 'active' },
  { household_member_id: 'm3', display_name: 'Invited Ian', status: 'invited' },
]
const milk = { item_id: 'a', name: 'Milk', quantity: '1 l', expires_on: '2026-10-25', note: null, location: 'fridge' }
const rice = { item_id: 'b', name: 'Rice', quantity: null, expires_on: null, note: null, location: 'pantry' }

// A stand-in for the HomeBase API that records every call
const fakeApi = (handlers = {}) => {
  const calls = []
  const api = async (path, options = {}) => {
    calls.push({ path, method: options.method || 'GET', body: options.body })
    if (path === '/api/households/me') return handlers.household === undefined ? { household_id: householdId, members } : handlers.household
    const [route, query = ''] = path.replace(`/api/households/${householdId}`, '').split('?')
    const handler = handlers[`${options.method || 'GET'} ${route}`]
    if (!handler) throw new Error(`No fake for ${path}`)
    return handler(options.body, Object.fromEntries(new URLSearchParams(query)))
  }
  return { api, calls }
}

const connect = async (api) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  // Signed in as Daniel
  await createMcpServer(api, { userId: 'u1' }).connect(serverTransport)
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(clientTransport)
  return client
}

const call = async (api, name, args = {}) => {
  const result = await (await connect(api)).callTool({ name, arguments: args })
  return { ...result, value: result.isError ? result.content[0].text : JSON.parse(result.content[0].text) }
}

describe('HomeBase MCP server', () => {
  it('offers the food, shopping, chore and money tools', async () => {
    const { tools } = await (await connect(fakeApi().api)).listTools()
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      'add_chores', 'add_expenses', 'add_food_items', 'add_shopping_items', 'complete_chore',
      'list_chores', 'list_expenses', 'list_food', 'list_shopping', 'money_summary',
      'remove_chore', 'remove_expense', 'remove_food_items', 'remove_shopping_item',
      'update_chore', 'update_expense', 'update_food_item', 'update_shopping_item',
    ])
  })

  it('lists food, optionally from one place', async () => {
    const { api } = fakeApi({ 'GET /fridge-items': () => [milk, rice] })
    assert.deepEqual((await call(api, 'list_food')).value.map((item) => item.name), ['Milk', 'Rice'])
    assert.deepEqual((await call(api, 'list_food', { location: 'pantry' })).value, [
      { itemId: 'b', name: 'Rice', quantity: null, expiresOn: null, note: null, location: 'pantry' },
    ])
  })

  it('adds several items in order and reports the ones that failed', async () => {
    const { api, calls } = fakeApi({
      'POST /fridge-items': (body) => {
        if (!body.name) throw new Error('Enter what it is')
        return { ...milk, item_id: body.name, name: body.name }
      },
    })
    const { value } = await call(api, 'add_food_items', { items: [{ name: 'Milk', quantity: '1 l' }, { name: '' }, { name: 'Eggs' }] })

    assert.deepEqual(value.added.map((item) => item.name), ['Milk', 'Eggs'])
    assert.deepEqual(value.failed, [{ name: '', error: 'Enter what it is' }])
    assert.deepEqual(calls.filter((entry) => entry.method === 'POST').map((entry) => entry.body), [
      { name: 'Milk', quantity: '1 l' }, { name: '' }, { name: 'Eggs' },
    ])
    // The household is looked up once per request
    assert.equal(calls.filter((entry) => entry.path === '/api/households/me').length, 1)
  })

  it('sends only the changed fields', async () => {
    const { api, calls } = fakeApi({ 'PATCH /fridge-items/a': (body) => ({ ...milk, quantity: body.quantity }) })
    const { value } = await call(api, 'update_food_item', { itemId: 'a', quantity: '2 l' })
    assert.equal(value.quantity, '2 l')
    assert.deepEqual(calls.at(-1).body, { quantity: '2 l' })
  })

  it('removes several items as used up or as mistakes and reports the ones that failed', async () => {
    const { api, calls } = fakeApi({
      'POST /fridge-items/a/used-up': () => ({ shoppingItem: null }),
      'DELETE /fridge-items/b': () => null,
      'DELETE /fridge-items/c': () => { throw new Error('Item not found') },
    })
    const { value } = await call(api, 'remove_food_items', { items: [{ itemId: 'a', usedUp: true }, { itemId: 'b' }, { itemId: 'c' }] })
    assert.deepEqual(value.removed, [{ itemId: 'a', usedUp: true }, { itemId: 'b', usedUp: false }])
    assert.deepEqual(value.failed, [{ itemId: 'c', error: 'Item not found' }])
    assert.deepEqual(calls.filter((entry) => entry.method !== 'GET').map((entry) => entry.method), ['POST', 'DELETE', 'DELETE'])
  })

  it('only accepts expiry dates as YYYY-MM-DD, or empty to clear one', async () => {
    const { api, calls } = fakeApi({ 'PATCH /fridge-items/a': (body) => ({ ...milk, expires_on: body.expiresOn || null }) })
    assert.equal((await call(api, 'add_food_items', { items: [{ name: 'Milk', expiresOn: '25/10/2026' }] })).isError, true)
    assert.equal((await call(api, 'update_food_item', { itemId: 'a', expiresOn: '' })).value.expiresOn, null)
    assert.equal(calls.some((entry) => entry.method === 'POST'), false)
  })

  it('marks only removing as destructive', async () => {
    const { tools } = await (await connect(fakeApi().api)).listTools()
    const destructive = tools.filter((tool) => !tool.annotations?.readOnlyHint && tool.annotations?.destructiveHint !== false)
    assert.deepEqual(destructive.map((tool) => tool.name), ['remove_food_items', 'remove_shopping_item', 'remove_chore', 'remove_expense'])
  })

  it('explains what went wrong instead of failing', async () => {
    const noHousehold = await call(fakeApi({ household: null }).api, 'list_food')
    assert.equal(noHousehold.isError, true)
    assert.match(noHousehold.value, /not in a household/)

    const apiError = await call(fakeApi({ 'PATCH /fridge-items/a': () => { throw new Error('Item not found') } }).api, 'update_food_item', { itemId: 'a', name: 'x' })
    assert.equal(apiError.value, 'Item not found')
  })

  describe('shopping', () => {
    const groceries = { list_id: 'g', name: 'Groceries' }
    const hardware = { list_id: 'h', name: 'Hardware' }
    const eggs = { item_id: 'e', list_id: 'g', name: 'Eggs', quantity: '6', note: null, kind: 'buy', status: 'open' }
    const bread = { item_id: 'b', list_id: 'g', name: 'Bread', quantity: null, note: null, kind: 'buy', status: 'bought' }
    const bike = { item_id: 'k', list_id: 'h', name: 'Old bike', quantity: null, note: null, kind: 'sell', status: 'listed' }
    const lists = { 'GET /shopping-lists': () => [groceries, hardware], 'GET /shopping-items': () => [eggs, bread, bike] }

    it('lists each list with what is still open', async () => {
      const { value } = await call(fakeApi(lists).api, 'list_shopping')
      assert.deepEqual(value.map((list) => [list.name, list.items.map((item) => item.name)]), [['Groceries', ['Eggs']], ['Hardware', ['Old bike']]])
      const withDone = (await call(fakeApi(lists).api, 'list_shopping', { includeDone: true })).value
      assert.deepEqual(withDone[0].items.map((item) => [item.name, item.done]), [['Eggs', false], ['Bread', true]])
    })

    it('adds to the first list unless another is named', async () => {
      const { api, calls } = fakeApi({ ...lists, 'POST /shopping-items': (body) => ({ ...eggs, item_id: body.name, name: body.name, list_id: body.listId }) })
      const first = (await call(api, 'add_shopping_items', { items: [{ name: 'Mustard' }] })).value
      assert.equal(first.list, 'Groceries')
      assert.deepEqual(calls.at(-1).body, { name: 'Mustard', listId: 'g', kind: 'buy' })

      const named = (await call(api, 'add_shopping_items', { listId: 'h', items: [{ name: 'Screws', quantity: '20' }] })).value
      assert.equal(named.list, 'Hardware')
      assert.deepEqual(calls.at(-1).body, { name: 'Screws', quantity: '20', listId: 'h', kind: 'buy' })

      const missing = await call(api, 'add_shopping_items', { listId: 'nope', items: [{ name: 'x' }] })
      assert.match(missing.value, /does not exist/)
    })

    it('ticks items off as bought or sold, and back on', async () => {
      const { api, calls } = fakeApi({ ...lists, 'PATCH /shopping-items/e': (body) => ({ ...eggs, ...body }), 'PATCH /shopping-items/k': (body) => ({ ...bike, ...body }) })
      assert.equal((await call(api, 'update_shopping_item', { itemId: 'e', done: true })).value.done, true)
      assert.deepEqual(calls.at(-1).body, { status: 'bought' })
      await call(api, 'update_shopping_item', { itemId: 'k', done: true })
      assert.deepEqual(calls.at(-1).body, { status: 'sold' })
      await call(api, 'update_shopping_item', { itemId: 'e', done: false, quantity: '12' })
      assert.deepEqual(calls.at(-1).body, { quantity: '12', status: 'open' })
    })

    it('removes an item', async () => {
      const { api, calls } = fakeApi({ 'DELETE /shopping-items/e': () => null })
      assert.equal((await call(api, 'remove_shopping_item', { itemId: 'e' })).isError, undefined)
      assert.equal(calls.at(-1).method, 'DELETE')
    })
  })

  describe('chores', () => {
    const bins = {
      chore_id: 'c1', name: 'Bins', due_on: '2026-10-21', frequency: 'weekly', fixed_schedule: true,
      assignee_member_id: 'm2', note: null, last_done_on: '2026-10-14', last_done_by_member_id: 'm1',
    }

    it('lists chores with names instead of member ids, and who can be given one', async () => {
      const { value } = await call(fakeApi({ 'GET /chores': () => [bins] }).api, 'list_chores')
      assert.deepEqual(value.members, ['Daniel', 'Carol'])
      assert.deepEqual(value.chores, [{
        choreId: 'c1', name: 'Bins', dueOn: '2026-10-21', frequency: 'weekly', fixedSchedule: true,
        assignee: 'Carol', note: null, lastDoneOn: '2026-10-14', lastDoneBy: 'Daniel',
      }])
    })

    it('adds chores as one-time unless told otherwise, giving them to members by name', async () => {
      const { api, calls } = fakeApi({ 'POST /chores': (body) => ({ ...bins, name: body.name, assignee_member_id: body.assigneeMemberId ?? null }) })
      const { value } = await call(api, 'add_chores', { chores: [
        { name: 'Fix the tap', dueOn: '2026-10-22' },
        { name: 'Bins', dueOn: '2026-10-21', frequency: 'weekly', fixedSchedule: true, assignee: 'carol' },
        { name: 'Water plants', dueOn: '2026-10-21', assignee: 'Ian' },
      ] })
      const posts = calls.filter((entry) => entry.method === 'POST').map((entry) => entry.body)
      assert.deepEqual(posts, [
        { frequency: 'once', name: 'Fix the tap', dueOn: '2026-10-22' },
        { frequency: 'weekly', name: 'Bins', dueOn: '2026-10-21', fixedSchedule: true, assigneeMemberId: 'm2' },
      ])
      assert.deepEqual(value.added.map((chore) => [chore.name, chore.assignee]), [['Fix the tap', null], ['Bins', 'Carol']])
      // Only joined members can be given a chore
      assert.equal(value.failed[0].name, 'Water plants')
      assert.match(value.failed[0].error, /Daniel, Carol/)
    })

    it('changes only the fields given, and can give a chore back to anyone', async () => {
      const { api, calls } = fakeApi({ 'PATCH /chores/c1': (body) => ({ ...bins, ...body }) })
      await call(api, 'update_chore', { choreId: 'c1', dueOn: '2026-10-23' })
      assert.deepEqual(calls.at(-1).body, { dueOn: '2026-10-23' })
      await call(api, 'update_chore', { choreId: 'c1', assignee: '' })
      assert.deepEqual(calls.at(-1).body, { assigneeMemberId: null })
    })

    it('marks a chore done and says when it is next due', async () => {
      const { api, calls } = fakeApi({
        'POST /chores/c1/done': () => ({ chore: { ...bins, due_on: '2026-10-28' }, completionId: 'x' }),
        'POST /chores/c2/done': () => ({ chore: null, completionId: 'y' }),
      })
      assert.deepEqual((await call(api, 'complete_chore', { choreId: 'c1', doneOn: '2026-10-20' })).value, { done: true, nextDueOn: '2026-10-28' })
      assert.deepEqual(calls.at(-1).body, { doneOn: '2026-10-20' })
      assert.deepEqual((await call(api, 'complete_chore', { choreId: 'c2', doneOn: '2026-10-20' })).value, { done: true, finished: true })
    })

    it('removes a chore', async () => {
      const { api, calls } = fakeApi({ 'DELETE /chores/c1': () => null })
      await call(api, 'remove_chore', { choreId: 'c1' })
      assert.equal(calls.at(-1).method, 'DELETE')
    })
  })

  describe('money', () => {
    const lidl = {
      expense_id: 'x1', expense_date: '2026-10-20', amount: '42.50', category_id: 'groceries', tag: 'Supermarket', description: 'Lidl',
      paid_by_member_id: 'm1', split_type: 'split', is_recurring: false, recurring_frequency: null, recurring_source_id: null,
    }
    const rent = { ...lidl, expense_id: 'x2', amount: '600', category_id: 'utilities', tag: 'Rent', description: 'Rent', paid_by_member_id: 'm2', is_recurring: true, recurring_frequency: 'monthly' }
    const solo = { ...lidl, expense_id: 'x3', amount: '10', category_id: 'going-out', tag: null, description: 'Coffee', split_type: 'one' }

    it('summarizes a month the way the Money tab does', () => {
      assert.deepEqual(summarizeMonth([lidl, rent, solo], members), {
        total: 652.5,
        byCategory: { groceries: 42.5, utilities: 600, 'going-out': 10 },
        members: [
          { name: 'Daniel', paid: 52.5, owed: 331.25, net: -278.75 },
          { name: 'Carol', paid: 600, owed: 321.25, net: 278.75 },
        ],
        settle: { owes: 'Daniel', owed: 'Carol', amount: 278.75 },
      })
      assert.equal(summarizeMonth([solo], members).settle, null)
    })

    it('lists expenses with names, from the start of this month unless told otherwise', async () => {
      const queries = []
      const { api } = fakeApi({ 'GET /expenses': (_body, query) => { queries.push(query); return [lidl, rent] } })
      const { value } = await call(api, 'list_expenses')
      assert.deepEqual(queries[0], { from: `${new Date().toISOString().slice(0, 7)}-01` })
      assert.deepEqual(value[0], {
        expenseId: 'x1', date: '2026-10-20', amount: 42.5, category: 'groceries', type: 'Supermarket', description: 'Lidl',
        paidBy: 'Daniel', split: true, repeats: null, isRepeat: false,
      })
      assert.equal(value[1].repeats, 'monthly')

      await call(api, 'list_expenses', { from: '2026-09-01', to: '2026-09-30', category: 'utilities' })
      assert.deepEqual(queries[1], { from: '2026-09-01', to: '2026-09-30', categoryId: 'utilities' })
    })

    it('asks the API for the whole month in the summary', async () => {
      const queries = []
      const { api } = fakeApi({ 'GET /expenses': (_body, query) => { queries.push(query); return [lidl] } })
      const { value } = await call(api, 'money_summary', { month: '2026-02' })
      assert.deepEqual(queries[0], { from: '2026-02-01', to: '2026-02-28' })
      assert.equal(value.month, '2026-02')
      assert.deepEqual(value.settle, { owes: 'Carol', owed: 'Daniel', amount: 21.25 })
    })

    it('adds expenses paid by the signed-in person unless someone else is named', async () => {
      const { api, calls } = fakeApi({ 'POST /expenses': (body) => ({ ...lidl, paid_by_member_id: body.paidByMemberId }) })
      const { value } = await call(api, 'add_expenses', { expenses: [
        { amount: 42.5, category: 'groceries', date: '2026-10-20', description: 'Lidl', split: true },
        { amount: 600, category: 'utilities', date: '2026-10-01', paidBy: 'Carol', repeats: 'monthly' },
        { amount: 5, category: 'other', date: '2026-10-01', paidBy: 'Ian' },
      ] })
      assert.deepEqual(calls.filter((entry) => entry.method === 'POST').map((entry) => entry.body), [
        { amount: 42.5, categoryId: 'groceries', expenseDate: '2026-10-20', description: 'Lidl', tag: null, paidByMemberId: 'm1', splitType: 'split', isRecurring: false, recurringFrequency: null },
        { amount: 600, categoryId: 'utilities', expenseDate: '2026-10-01', description: null, tag: null, paidByMemberId: 'm2', splitType: 'one', isRecurring: true, recurringFrequency: 'monthly' },
      ])
      assert.deepEqual(value.added.map((expense) => expense.paidBy), ['Daniel', 'Carol'])
      assert.match(value.failed[0].error, /No joined member is called "Ian"/)
    })

    it('changes only the fields given, keeping the rest of the expense', async () => {
      const { api, calls } = fakeApi({ 'GET /expenses': () => [lidl, rent], 'PATCH /expenses/x2': (body) => ({ ...rent, amount: String(body.amount), is_recurring: body.isRecurring }) })
      const { value } = await call(api, 'update_expense', { expenseId: 'x2', amount: 650, repeats: '' })
      assert.deepEqual(calls.at(-1).body, {
        amount: 650, categoryId: 'utilities', expenseDate: '2026-10-20', description: 'Rent', tag: 'Rent',
        paidByMemberId: 'm2', splitType: 'split', isRecurring: false, recurringFrequency: null,
      })
      assert.deepEqual([value.amount, value.repeats], [650, null])

      const missing = await call(api, 'update_expense', { expenseId: 'nope', amount: 1 })
      assert.equal(missing.value, 'Expense not found')
    })

    it('removes an expense', async () => {
      const { api, calls } = fakeApi({ 'DELETE /expenses/x1': () => null })
      await call(api, 'remove_expense', { expenseId: 'x1' })
      assert.equal(calls.at(-1).method, 'DELETE')
    })
  })
})
