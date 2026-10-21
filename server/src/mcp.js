// HomeBase as an MCP server: lets Claude (for example on a phone, from a photo of the fridge) use the app
// as the signed-in person. Every tool goes through the app's own API with that person's token, so the
// same checks, validation and live updates apply as when they tap around in the app.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { CHORE_FREQUENCIES } from './chores.js'
import { FOOD_LOCATIONS } from './fridge.js'
import { CATEGORY_IDS } from './receipts.js'
import { FREQUENCIES } from './recurring.js'
import { DONE_STATUS, OPEN_STATUS, isDone } from './shopping.js'

const INSTRUCTIONS = `HomeBase is a shared household app. These tools manage the food at home (kept in the fridge or the pantry), the shopping lists, the chores and the shared expenses.
When someone sends a photo of their fridge or pantry, list what you can see, check it against list_food so nothing is added twice, then add the new items with one add_food_items call.
Use short everyday names ("Milk", "Cheddar"), put amounts in quantity ("1 l", "6", "half a pack") and only set expiresOn when a date is readable or the person tells you.
To put something on the shopping list, use add_shopping_items; it goes on the first list (usually Groceries) unless the person names another one from list_shopping.
Chores have a due date and repeat once, daily, weekly or monthly. Use the person's own local date for dueOn and doneOn, and give a chore to someone by the name list_chores shows for the household's members.
Expenses are in euros. When someone sends a receipt, add it with add_expenses using the total, the receipt's date and the category that fits; it is paid by the signed-in person unless they say otherwise. Ask whether to split it equally when they have not said, since that decides who owes whom. money_summary answers "who owes whom" for a month.`

const location = z.enum(FOOD_LOCATIONS)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

const foodFields = {
  name: z.string().describe('What it is, e.g. "Milk"'),
  quantity: z.string().optional().describe('How much, e.g. "1 l", "6", "half a pack"'),
  expiresOn: date.optional().describe('Expiry date as YYYY-MM-DD'),
  note: z.string().optional(),
  location: location.optional().describe('Where it is kept; fridge when left out'),
}

// The fields Claude needs, in the app's own words
const describeItem = (item) => ({
  itemId: item.item_id,
  name: item.name,
  quantity: item.quantity,
  expiresOn: item.expires_on,
  note: item.note,
  location: item.location,
})

// A shopping item, in the app's own words
const describeShoppingItem = (item) => ({
  itemId: item.item_id,
  name: item.name,
  quantity: item.quantity,
  note: item.note,
  kind: item.kind,
  done: isDone(item),
})

const frequency = z.enum(CHORE_FREQUENCIES)

const choreFields = {
  name: z.string().describe('What needs doing, e.g. "Take out the bins"'),
  dueOn: z.string().describe('When it is next due, as YYYY-MM-DD'),
  frequency: frequency.optional().describe('How often it repeats; once when left out'),
  fixedSchedule: z.boolean().optional()
    .describe('Keep the same weekday or day of the month however early or late it is done (bin day). Otherwise the next date counts from the day it was done.'),
  assignee: z.string().optional().describe('The member who does it, by name; leave out or send an empty string for anyone'),
  note: z.string().optional(),
}

const expenseFields = {
  amount: z.number().positive().describe('In euros, e.g. 23.40'),
  category: z.enum(CATEGORY_IDS),
  date: date.describe('When it was paid, as YYYY-MM-DD'),
  description: z.string().optional().describe('What it was, e.g. "Lidl" or "Electricity October"'),
  type: z.string().optional().describe('A finer kind within the category as the app names it, e.g. "Supermarket" or "Fuel"'),
  paidBy: z.string().optional().describe('The member who paid, by name; the signed-in person when left out'),
  split: z.boolean().optional().describe('true to share it equally between the joined members; false (the default) when the payer covers it all'),
  repeats: z.enum(FREQUENCIES).optional().describe('Add it again automatically every week, month or year'),
}

// Paid, owed and net per joined member for a month's expenses, the way the app's Money tab counts them
// (src/core/utils/calculations.js): a split expense is shared equally, otherwise the payer owes all of it.
export const summarizeMonth = (expenses, members) => {
  const joined = members.filter((member) => member.status === 'active')
  const people = Object.fromEntries(joined.map((member) => [member.household_member_id, { name: member.display_name, paid: 0, owed: 0 }]))
  const round = (value) => Math.round(value * 100) / 100
  const byCategory = {}
  let total = 0

  for (const expense of expenses) {
    const amount = Number(expense.amount)
    total += amount
    byCategory[expense.category_id] = (byCategory[expense.category_id] || 0) + amount
    const payer = people[expense.paid_by_member_id]
    if (payer) payer.paid += amount
    if (expense.split_type === 'split') {
      for (const person of Object.values(people)) person.owed += amount / joined.length
    } else if (payer) {
      payer.owed += amount
    }
  }

  const summary = Object.values(people).map((person) => ({ ...person, net: round(person.paid - person.owed) }))
  const sorted = [...summary].sort((left, right) => right.net - left.net)
  const owed = sorted[0]
  const owes = sorted.at(-1)
  const settle = owed && owes && owed !== owes && owed.net > 0 && owes.net < 0
    ? { owes: owes.name, owed: owed.name, amount: round(Math.min(owed.net, -owes.net)) }
    : null

  return {
    total: round(total),
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([category, amount]) => [category, round(amount)])),
    members: summary.map((person) => ({ ...person, paid: round(person.paid), owed: round(person.owed) })),
    settle,
  }
}

const reply = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] })
const failure = (message) => ({ content: [{ type: 'text', text: message }], isError: true })

// `api(path, options)` calls the HomeBase API as the signed-in person and returns the parsed JSON,
// throwing an Error with the API's message when the request fails.
export const createMcpServer = (api, { userId } = {}) => {
  const server = new McpServer({ name: 'homebase', version: '1.0.0' }, { instructions: INSTRUCTIONS })

  // Each MCP request gets its own server, so this looks the household up at most once per request
  let found = null
  const loadHousehold = async () => {
    found ??= await api('/api/households/me')
    if (!found) throw new Error('You are not in a household yet. Open HomeBase and create or join one first.')
    return found
  }
  const household = async () => `/api/households/${(await loadHousehold()).household_id}`

  // Chores are given to members who have joined, named the way the app shows them
  const joinedMembers = async () => ((await loadHousehold()).members || []).filter((member) => member.status === 'active')
  const memberName = (members, memberId) => members.find((member) => member.household_member_id === memberId)?.display_name ?? null
  const memberIdFor = async (name) => {
    if (!name?.trim()) return null
    const members = await joinedMembers()
    const member = members.find((entry) => entry.display_name.toLowerCase() === name.trim().toLowerCase())
    if (!member) throw new Error(`No joined member is called "${name}". The members are: ${members.map((entry) => entry.display_name).join(', ')}`)
    return member.household_member_id
  }

  // A chore, in the app's own words
  const describeChore = (chore, members) => ({
    choreId: chore.chore_id,
    name: chore.name,
    dueOn: chore.due_on,
    frequency: chore.frequency,
    fixedSchedule: chore.fixed_schedule,
    assignee: memberName(members, chore.assignee_member_id),
    note: chore.note,
    lastDoneOn: chore.last_done_on,
    lastDoneBy: memberName(members, chore.last_done_by_member_id),
  })

  // The API's field names for the chore fields Claude sent, leaving out the ones it did not
  const choreBody = async ({ assignee, ...fields }) => ({
    ...fields,
    ...(assignee === undefined ? {} : { assigneeMemberId: await memberIdFor(assignee) }),
  })

  // An expense, in the app's own words
  const describeExpense = (expense, members) => ({
    expenseId: expense.expense_id,
    date: expense.expense_date,
    amount: Number(expense.amount),
    category: expense.category_id,
    type: expense.tag,
    description: expense.description,
    paidBy: memberName(members, expense.paid_by_member_id),
    split: expense.split_type === 'split',
    repeats: expense.is_recurring ? expense.recurring_frequency : null,
    // Added automatically by a repeating expense; change the original to change future ones
    isRepeat: Boolean(expense.recurring_source_id),
  })

  // The signed-in person's own member id, the payer when none is named
  const ownMemberId = async () => {
    const own = (await joinedMembers()).find((member) => member.auth_user_id === userId)
    if (!own) throw new Error('Say who paid: the signed-in person is not a joined member of this household.')
    return own.household_member_id
  }

  // The API takes the whole expense, in its own field names. `payerId` keeps a payer already on the expense.
  const expenseBody = async ({ amount, category, date: expenseDate, description, type, paidBy, payerId, split, repeats }) => ({
    amount,
    categoryId: category,
    expenseDate,
    description: description || null,
    tag: type || null,
    paidByMemberId: paidBy ? await memberIdFor(paidBy) : payerId ?? await ownMemberId(),
    splitType: split ? 'split' : 'one',
    isRecurring: Boolean(repeats),
    recurringFrequency: repeats || null,
  })

  // Turns a thrown API error into a tool error Claude can read and act on
  const tool = (handler) => async (args) => {
    try {
      return await handler(args)
    } catch (error) {
      return failure(error.message)
    }
  }

  server.registerTool('list_food', {
    title: 'List food',
    description: 'Lists the food at home, soonest expiry first. Leave location out for both the fridge and the pantry.',
    inputSchema: { location: location.optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, tool(async ({ location: where }) => {
    const items = await api(`${await household()}/fridge-items`)
    return reply(items.filter((item) => !where || item.location === where).map(describeItem))
  }))

  server.registerTool('add_food_items', {
    title: 'Add food',
    description: 'Adds one or more items to the fridge or pantry. Reports which were added and which failed.',
    inputSchema: { items: z.array(z.object(foodFields)).min(1).max(50) },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, tool(async ({ items }) => {
    const path = `${await household()}/fridge-items`
    const added = []
    const failed = []
    // One at a time, in order, so the app shows them the way they were listed
    for (const item of items) {
      try {
        added.push(describeItem(await api(path, { method: 'POST', body: item })))
      } catch (error) {
        failed.push({ name: item.name, error: error.message })
      }
    }
    return reply({ added, failed })
  }))

  server.registerTool('update_food_item', {
    title: 'Change food',
    description: 'Changes an item from list_food. Only the fields given are changed; send an empty string to clear one.',
    inputSchema: {
      itemId: z.string(),
      ...Object.fromEntries(Object.entries(foodFields).map(([key, schema]) => [key, schema.optional()])),
      // An empty string clears the date
      expiresOn: z.union([date, z.literal('')]).optional().describe('Expiry date as YYYY-MM-DD'),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, tool(async ({ itemId, ...changes }) => {
    const item = await api(`${await household()}/fridge-items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: changes })
    return reply(describeItem(item))
  }))

  server.registerTool('remove_food_items', {
    title: 'Remove food',
    description: 'Removes one or more items from list_food. Set usedUp when an item was eaten or thrown away, leave it false when it was added by mistake. Reports which were removed and which failed.',
    inputSchema: { items: z.array(z.object({ itemId: z.string(), usedUp: z.boolean().optional() })).min(1).max(50) },
    annotations: { destructiveHint: true, openWorldHint: false },
  }, tool(async ({ items }) => {
    const base = `${await household()}/fridge-items`
    const removed = []
    const failed = []
    for (const { itemId, usedUp = false } of items) {
      const path = `${base}/${encodeURIComponent(itemId)}`
      try {
        if (usedUp) await api(`${path}/used-up`, { method: 'POST', body: {} })
        else await api(path, { method: 'DELETE' })
        removed.push({ itemId, usedUp })
      } catch (error) {
        failed.push({ itemId, error: error.message })
      }
    }
    return reply({ removed, failed })
  }))

  server.registerTool('list_shopping', {
    title: 'List shopping',
    description: 'Lists the shopping lists and what is still to buy (or sell) on each. Set includeDone to also see what was already bought or sold.',
    inputSchema: { includeDone: z.boolean().optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, tool(async ({ includeDone = false }) => {
    const path = await household()
    const [lists, items] = await Promise.all([api(`${path}/shopping-lists`), api(`${path}/shopping-items`)])
    return reply(lists.map((list) => ({
      listId: list.list_id,
      name: list.name,
      items: items
        .filter((item) => item.list_id === list.list_id && (includeDone || !isDone(item)))
        .map(describeShoppingItem),
    })))
  }))

  server.registerTool('add_shopping_items', {
    title: 'Add to shopping list',
    description: 'Puts one or more things on a shopping list, the first list (usually Groceries) unless listId is given. Reports which were added and which failed.',
    inputSchema: {
      listId: z.string().optional().describe('A list from list_shopping'),
      items: z.array(z.object({
        name: z.string().describe('What to buy, e.g. "Mustard"'),
        quantity: z.string().optional().describe('How much, e.g. "2", "1 kg"'),
        note: z.string().optional(),
      })).min(1).max(50),
    },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, tool(async ({ listId, items }) => {
    const path = await household()
    // Listing the lists also creates the Groceries list for a household that has none yet
    const lists = await api(`${path}/shopping-lists`)
    const list = listId ? lists.find((entry) => entry.list_id === listId) : lists[0]
    if (!list) throw new Error('That list does not exist. Use list_shopping to see the lists.')

    const added = []
    const failed = []
    for (const item of items) {
      try {
        const created = await api(`${path}/shopping-items`, { method: 'POST', body: { ...item, listId: list.list_id, kind: 'buy' } })
        added.push(describeShoppingItem(created))
      } catch (error) {
        failed.push({ name: item.name, error: error.message })
      }
    }
    return reply({ list: list.name, added, failed })
  }))

  server.registerTool('update_shopping_item', {
    title: 'Change shopping item',
    description: 'Ticks an item from list_shopping off (done: true) or back on (done: false), or changes its name, quantity or note. Send an empty string to clear quantity or note.',
    inputSchema: {
      itemId: z.string(),
      done: z.boolean().optional(),
      name: z.string().optional(),
      quantity: z.string().optional(),
      note: z.string().optional(),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, tool(async ({ itemId, done, ...changes }) => {
    const path = await household()
    const body = { ...changes }
    if (done !== undefined) {
      // Done means bought for things to buy and sold for things to sell
      const existing = (await api(`${path}/shopping-items`)).find((item) => item.item_id === itemId)
      if (!existing) throw new Error('Item not found')
      body.status = done ? DONE_STATUS[existing.kind] : OPEN_STATUS[existing.kind]
    }
    const item = await api(`${path}/shopping-items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body })
    return reply(describeShoppingItem(item))
  }))

  server.registerTool('remove_shopping_item', {
    title: 'Remove shopping item',
    description: 'Takes an item from list_shopping off its list. To mark it bought, use update_shopping_item with done: true instead.',
    inputSchema: { itemId: z.string() },
    annotations: { destructiveHint: true, openWorldHint: false },
  }, tool(async ({ itemId }) => {
    await api(`${await household()}/shopping-items/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
    return reply({ removed: itemId })
  }))

  server.registerTool('list_chores', {
    title: 'List chores',
    description: 'Lists the chores still to do, soonest first, with who does each one and who did it last. Also lists the household members chores can be given to.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, tool(async () => {
    const chores = await api(`${await household()}/chores`)
    const members = (await loadHousehold()).members || []
    return reply({
      members: (await joinedMembers()).map((member) => member.display_name),
      chores: chores.map((chore) => describeChore(chore, members)),
    })
  }))

  server.registerTool('add_chores', {
    title: 'Add chores',
    description: 'Adds one or more chores. Reports which were added and which failed.',
    inputSchema: { chores: z.array(z.object(choreFields)).min(1).max(50) },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, tool(async ({ chores }) => {
    const path = `${await household()}/chores`
    const members = (await loadHousehold()).members || []
    const added = []
    const failed = []
    for (const chore of chores) {
      try {
        const created = await api(path, { method: 'POST', body: { frequency: 'once', ...(await choreBody(chore)) } })
        added.push(describeChore(created, members))
      } catch (error) {
        failed.push({ name: chore.name, error: error.message })
      }
    }
    return reply({ added, failed })
  }))

  server.registerTool('update_chore', {
    title: 'Change chore',
    description: 'Changes a chore from list_chores. Only the fields given are changed. A new due date, frequency or fixedSchedule restarts its schedule from that date.',
    inputSchema: {
      choreId: z.string(),
      ...Object.fromEntries(Object.entries(choreFields).map(([key, schema]) => [key, schema.optional()])),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, tool(async ({ choreId, ...changes }) => {
    const path = `${await household()}/chores/${encodeURIComponent(choreId)}`
    const chore = await api(path, { method: 'PATCH', body: await choreBody(changes) })
    return reply(describeChore(chore, (await loadHousehold()).members || []))
  }))

  server.registerTool('complete_chore', {
    title: 'Mark chore done',
    description: 'Marks a chore from list_chores as done by the signed-in person. A repeating chore moves to its next date; a one-time chore is finished.',
    inputSchema: { choreId: z.string(), doneOn: z.string().describe("The day it was done, as YYYY-MM-DD in the person's own time zone") },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, tool(async ({ choreId, doneOn }) => {
    const path = `${await household()}/chores/${encodeURIComponent(choreId)}/done`
    const { chore } = await api(path, { method: 'POST', body: { doneOn } })
    return reply(chore ? { done: true, nextDueOn: chore.due_on } : { done: true, finished: true })
  }))

  server.registerTool('remove_chore', {
    title: 'Remove chore',
    description: 'Deletes a chore from list_chores for good, including its repeats. To record that it was done, use complete_chore instead.',
    inputSchema: { choreId: z.string() },
    annotations: { destructiveHint: true, openWorldHint: false },
  }, tool(async ({ choreId }) => {
    await api(`${await household()}/chores/${encodeURIComponent(choreId)}`, { method: 'DELETE' })
    return reply({ removed: choreId })
  }))

  server.registerTool('list_expenses', {
    title: 'List expenses',
    description: 'Lists the expenses between two dates, newest first, with who paid and whether each is split. Without dates it lists this month so far.',
    inputSchema: {
      from: date.optional().describe('First day, as YYYY-MM-DD'),
      to: date.optional().describe('Last day, as YYYY-MM-DD'),
      category: z.enum(CATEGORY_IDS).optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, tool(async ({ from, to, category }) => {
    const query = new URLSearchParams({ from: from || `${new Date().toISOString().slice(0, 7)}-01` })
    if (to) query.set('to', to)
    if (category) query.set('categoryId', category)
    const expenses = await api(`${await household()}/expenses?${query}`)
    const members = (await loadHousehold()).members || []
    return reply(expenses.map((expense) => describeExpense(expense, members)))
  }))

  server.registerTool('money_summary', {
    title: 'Money summary',
    description: "Totals for a month: spent per category, what each member paid and owes, and who owes whom, as the app's Money tab counts them.",
    inputSchema: { month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM').optional().describe('As YYYY-MM; this month when left out') },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, tool(async ({ month = new Date().toISOString().slice(0, 7) }) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
    const expenses = await api(`${await household()}/expenses?${new URLSearchParams({ from: `${month}-01`, to: lastDay })}`)
    return reply({ month, ...summarizeMonth(expenses, (await loadHousehold()).members || []) })
  }))

  server.registerTool('add_expenses', {
    title: 'Add expenses',
    description: 'Adds one or more expenses. Reports which were added and which failed.',
    inputSchema: { expenses: z.array(z.object(expenseFields)).min(1).max(50) },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, tool(async ({ expenses }) => {
    const path = `${await household()}/expenses`
    const members = (await loadHousehold()).members || []
    const added = []
    const failed = []
    for (const expense of expenses) {
      try {
        added.push(describeExpense(await api(path, { method: 'POST', body: await expenseBody(expense) }), members))
      } catch (error) {
        failed.push({ description: expense.description ?? null, amount: expense.amount, error: error.message })
      }
    }
    return reply({ added, failed })
  }))

  server.registerTool('update_expense', {
    title: 'Change expense',
    description: 'Changes an expense from list_expenses. Only the fields given are changed; send an empty string to clear description or type, and repeats: "" to stop it repeating.',
    inputSchema: {
      expenseId: z.string(),
      ...Object.fromEntries(Object.entries(expenseFields).map(([key, schema]) => [key, schema.optional()])),
      repeats: z.union([z.enum(FREQUENCIES), z.literal('')]).optional().describe('weekly, monthly or yearly; an empty string stops it repeating'),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, tool(async ({ expenseId, ...changes }) => {
    const path = await household()
    // The API replaces the whole expense, so the fields left out come from the current one
    const existing = (await api(`${path}/expenses`)).find((expense) => expense.expense_id === expenseId)
    if (!existing) throw new Error('Expense not found')
    const members = (await loadHousehold()).members || []
    // An older expense may keep a payer who has since left, so the payer stays unless a new one is named
    const { paidBy: _currentPayer, ...current } = describeExpense(existing, members)
    const body = await expenseBody({ ...current, payerId: existing.paid_by_member_id, ...changes })
    const expense = await api(`${path}/expenses/${encodeURIComponent(expenseId)}`, { method: 'PATCH', body })
    return reply(describeExpense(expense, members))
  }))

  server.registerTool('remove_expense', {
    title: 'Remove expense',
    description: 'Deletes an expense from list_expenses. Deleting a repeating expense also stops its future repeats.',
    inputSchema: { expenseId: z.string() },
    annotations: { destructiveHint: true, openWorldHint: false },
  }, tool(async ({ expenseId }) => {
    await api(`${await household()}/expenses/${encodeURIComponent(expenseId)}`, { method: 'DELETE' })
    return reply({ removed: expenseId })
  }))

  return server
}
