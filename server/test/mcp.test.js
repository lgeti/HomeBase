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
  it('offers the food and shopping tools', async () => {
    const { tools } = await (await connect(fakeApi().api)).listTools()
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      'add_food_items', 'add_shopping_items', 'list_food', 'list_shopping',
      'remove_food_item', 'remove_shopping_item', 'update_food_item', 'update_shopping_item',
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

  it('removes an item as used up or as a mistake', async () => {
    const { api, calls } = fakeApi({ 'POST /fridge-items/a/used-up': () => ({ shoppingItem: null }), 'DELETE /fridge-items/a': () => null })
    await call(api, 'remove_food_item', { itemId: 'a', usedUp: true })
    await call(api, 'remove_food_item', { itemId: 'a' })
    assert.deepEqual(calls.filter((entry) => entry.method !== 'GET').map((entry) => entry.method), ['POST', 'DELETE'])
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
})
