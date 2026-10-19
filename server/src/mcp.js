// HomeBase as an MCP server: lets Claude (for example on a phone, from a photo of the fridge) use the app
// as the signed-in person. Every tool goes through the app's own API with that person's token, so the
// same checks, validation and live updates apply as when they tap around in the app.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { FOOD_LOCATIONS } from './fridge.js'
import { DONE_STATUS, OPEN_STATUS, isDone } from './shopping.js'

const INSTRUCTIONS = `HomeBase is a shared household app. These tools manage the food at home (kept in the fridge or the pantry) and the shopping lists.
When someone sends a photo of their fridge or pantry, list what you can see, check it against list_food so nothing is added twice, then add the new items with one add_food_items call.
Use short everyday names ("Milk", "Cheddar"), put amounts in quantity ("1 l", "6", "half a pack") and only set expiresOn when a date is readable or the person tells you.
To put something on the shopping list, use add_shopping_items; it goes on the first list (usually Groceries) unless the person names another one from list_shopping.`

const location = z.enum(FOOD_LOCATIONS)

const foodFields = {
  name: z.string().describe('What it is, e.g. "Milk"'),
  quantity: z.string().optional().describe('How much, e.g. "1 l", "6", "half a pack"'),
  expiresOn: z.string().optional().describe('Expiry date as YYYY-MM-DD'),
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

const reply = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] })
const failure = (message) => ({ content: [{ type: 'text', text: message }], isError: true })

// `api(path, options)` calls the HomeBase API as the signed-in person and returns the parsed JSON,
// throwing an Error with the API's message when the request fails.
export const createMcpServer = (api) => {
  const server = new McpServer({ name: 'homebase', version: '1.0.0' }, { instructions: INSTRUCTIONS })

  // Each MCP request gets its own server, so this looks the household up at most once per request
  let householdPath = null
  const household = async () => {
    if (householdPath) return householdPath
    const found = await api('/api/households/me')
    if (!found) throw new Error('You are not in a household yet. Open HomeBase and create or join one first.')
    householdPath = `/api/households/${found.household_id}`
    return householdPath
  }

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
    annotations: { readOnlyHint: true },
  }, tool(async ({ location: where }) => {
    const items = await api(`${await household()}/fridge-items`)
    return reply(items.filter((item) => !where || item.location === where).map(describeItem))
  }))

  server.registerTool('add_food_items', {
    title: 'Add food',
    description: 'Adds one or more items to the fridge or pantry. Reports which were added and which failed.',
    inputSchema: { items: z.array(z.object(foodFields)).min(1).max(50) },
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
    },
  }, tool(async ({ itemId, ...changes }) => {
    const item = await api(`${await household()}/fridge-items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: changes })
    return reply(describeItem(item))
  }))

  server.registerTool('remove_food_item', {
    title: 'Remove food',
    description: 'Removes an item from list_food. Set usedUp when it was eaten or thrown away, leave it false when it was added by mistake.',
    inputSchema: { itemId: z.string(), usedUp: z.boolean().optional() },
    annotations: { destructiveHint: true },
  }, tool(async ({ itemId, usedUp = false }) => {
    const path = `${await household()}/fridge-items/${encodeURIComponent(itemId)}`
    if (usedUp) await api(`${path}/used-up`, { method: 'POST', body: {} })
    else await api(path, { method: 'DELETE' })
    return reply({ removed: itemId, usedUp })
  }))

  server.registerTool('list_shopping', {
    title: 'List shopping',
    description: 'Lists the shopping lists and what is still to buy (or sell) on each. Set includeDone to also see what was already bought or sold.',
    inputSchema: { includeDone: z.boolean().optional() },
    annotations: { readOnlyHint: true },
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
    annotations: { destructiveHint: true },
  }, tool(async ({ itemId }) => {
    await api(`${await household()}/shopping-items/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
    return reply({ removed: itemId })
  }))

  return server
}
