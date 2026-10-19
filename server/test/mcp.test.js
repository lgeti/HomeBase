import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer } from '../src/mcp.js'

const householdId = '11111111-1111-1111-1111-111111111111'
const milk = { item_id: 'a', name: 'Milk', quantity: '1 l', expires_on: '2026-10-25', note: null, location: 'fridge' }
const rice = { item_id: 'b', name: 'Rice', quantity: null, expires_on: null, note: null, location: 'pantry' }

// A stand-in for the HomeBase API that records every call
const fakeApi = (handlers = {}) => {
  const calls = []
  const api = async (path, options = {}) => {
    calls.push({ path, method: options.method || 'GET', body: options.body })
    if (path === '/api/households/me') return handlers.household === undefined ? { household_id: householdId } : handlers.household
    const handler = handlers[`${options.method || 'GET'} ${path.replace(`/api/households/${householdId}`, '')}`]
    if (!handler) throw new Error(`No fake for ${path}`)
    return handler(options.body)
  }
  return { api, calls }
}

const connect = async (api) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await createMcpServer(api).connect(serverTransport)
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(clientTransport)
  return client
}

const call = async (api, name, args = {}) => {
  const result = await (await connect(api)).callTool({ name, arguments: args })
  return { ...result, value: result.isError ? result.content[0].text : JSON.parse(result.content[0].text) }
}

describe('HomeBase MCP server', () => {
  it('offers the food tools', async () => {
    const { tools } = await (await connect(fakeApi().api)).listTools()
    assert.deepEqual(tools.map((tool) => tool.name).sort(), ['add_food_items', 'list_food', 'remove_food_items', 'update_food_item'])
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
    assert.deepEqual(destructive.map((tool) => tool.name), ['remove_food_items'])
  })

  it('explains what went wrong instead of failing', async () => {
    const noHousehold = await call(fakeApi({ household: null }).api, 'list_food')
    assert.equal(noHousehold.isError, true)
    assert.match(noHousehold.value, /not in a household/)

    const apiError = await call(fakeApi({ 'PATCH /fridge-items/a': () => { throw new Error('Item not found') } }).api, 'update_food_item', { itemId: 'a', name: 'x' })
    assert.equal(apiError.value, 'Item not found')
  })
})
