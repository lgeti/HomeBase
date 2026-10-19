// HomeBase as an MCP server: lets Claude (for example on a phone, from a photo of the fridge) use the app
// as the signed-in person. Every tool goes through the app's own API with that person's token, so the
// same checks, validation and live updates apply as when they tap around in the app.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { FOOD_LOCATIONS } from './fridge.js'

const INSTRUCTIONS = `HomeBase is a shared household app. These tools manage the food at home, kept in the fridge or the pantry.
When someone sends a photo of their fridge or pantry, list what you can see, check it against list_food so nothing is added twice, then add the new items with one add_food_items call.
Use short everyday names ("Milk", "Cheddar"), put amounts in quantity ("1 l", "6", "half a pack") and only set expiresOn when a date is readable or the person tells you.`

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

  return server
}
