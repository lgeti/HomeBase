import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRateLimiter, limitPerAddress } from '../src/rateLimit.js'

describe('createRateLimiter', () => {
  it('allows a few calls per window per key', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 })
    assert.equal(allow('h1', 0), true)
    assert.equal(allow('h1', 10), true)
    assert.equal(allow('h1', 20), false)
    assert.equal(allow('h2', 20), true)
    assert.equal(allow('h1', 1001), true)
  })

  it('still limits a busy key after forgetting idle ones', () => {
    const allow = createRateLimiter({ limit: 1, windowMs: 1000 })
    assert.equal(allow('busy', 5000), true)
    for (let index = 0; index < 5001; index += 1) allow(`idle-${index}`, 0)
    assert.equal(allow('busy', 5001), false)
  })
})

describe('limitPerAddress', () => {
  const run = (middleware, ip) => {
    let status = null
    let passed = false
    const response = { set() {}, status(code) { status = code; return this }, json() {} }
    middleware({ ip }, response, () => { passed = true })
    return { passed, status }
  }

  it('refuses an address over the limit with 429', () => {
    const middleware = limitPerAddress({ limit: 1, windowMs: 60000 })
    assert.equal(run(middleware, '203.0.113.5').passed, true)
    assert.equal(run(middleware, '203.0.113.5').status, 429)
    assert.equal(run(middleware, '203.0.113.6').passed, true)
  })

  it('never limits the API calling itself for the MCP tools', () => {
    const middleware = limitPerAddress({ limit: 1, windowMs: 60000 })
    for (let index = 0; index < 3; index += 1) assert.equal(run(middleware, '127.0.0.1').passed, true)
  })
})
