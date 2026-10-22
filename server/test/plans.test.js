import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { describePlan, hasFeature, isOverQuota, memberFits, monthStartUtc, PLANS, planError, planOf, usageLimit } from '../src/plans.js'

const members = (...statuses) => statuses.map((status) => ({ status }))

describe('PLANS', () => {
  it('sets the free and pro limits', () => {
    assert.deepEqual(PLANS.free, { name: 'Free', members: 2, aiCallsPerMonth: 10, mcp: false })
    assert.deepEqual(PLANS.pro, { name: 'Pro', members: Infinity, aiCallsPerMonth: 200, mcp: true })
  })
})

describe('planOf', () => {
  it('treats households without a plan as free', () => {
    assert.equal(planOf(null), 'free')
    assert.equal(planOf({}), 'free')
    assert.equal(planOf({ plan: 'free' }), 'free')
  })

  it('gives pro while it is paid for or was granted by hand', () => {
    assert.equal(planOf({ plan: 'pro', plan_status: null }), 'pro')
    assert.equal(planOf({ plan: 'pro', plan_status: 'active' }), 'pro')
    assert.equal(planOf({ plan: 'pro', plan_status: 'trialing' }), 'pro')
    assert.equal(planOf({ plan: 'pro', plan_status: 'past_due' }), 'pro')
  })

  it('falls back to free once the subscription has ended', () => {
    assert.equal(planOf({ plan: 'pro', plan_status: 'canceled' }), 'free')
    assert.equal(planOf({ plan: 'pro', plan_status: 'unpaid' }), 'free')
  })
})

describe('hasFeature', () => {
  it('keeps Claude access for pro', () => {
    assert.equal(hasFeature('free', 'mcp'), false)
    assert.equal(hasFeature('pro', 'mcp'), true)
  })

  it('is false for unknown plans and features', () => {
    assert.equal(hasFeature('gold', 'mcp'), false)
    assert.equal(hasFeature('pro', 'teleport'), false)
  })
})

describe('usageLimit and isOverQuota', () => {
  it('counts AI calls per month', () => {
    assert.equal(usageLimit('free', 'ai_call'), 10)
    assert.equal(usageLimit('pro', 'ai_call'), 200)
  })

  it('allows nothing for unknown kinds', () => {
    assert.equal(usageLimit('pro', 'teleport'), 0)
  })

  it('stops at the limit, not after it', () => {
    assert.equal(isOverQuota(9, 10), false)
    assert.equal(isOverQuota(10, 10), true)
    assert.equal(isOverQuota(0, 0), true)
  })
})

describe('monthStartUtc', () => {
  it('starts the month at midnight UTC on the 1st', () => {
    assert.equal(monthStartUtc(new Date('2026-10-22T15:30:00Z')), '2026-10-01T00:00:00.000Z')
    assert.equal(monthStartUtc(new Date('2026-01-01T00:00:00Z')), '2026-01-01T00:00:00.000Z')
  })
})

describe('memberFits', () => {
  it('lets a free household of one add a second person', () => {
    assert.equal(memberFits('free', members('active')), true)
  })

  it('counts pending members as taking a place', () => {
    assert.equal(memberFits('free', members('active', 'pending')), false)
  })

  it('does not count removed members', () => {
    assert.equal(memberFits('free', members('active', 'removed', 'removed')), true)
  })

  it('lets an existing pending member be invited while there is room for them to join', () => {
    assert.equal(memberFits('free', members('active', 'pending'), { existingPending: true }), true)
    assert.equal(memberFits('free', members('active', 'active', 'pending'), { existingPending: true }), false)
  })

  it('has no cap on pro', () => {
    assert.equal(memberFits('pro', members(...Array(50).fill('active'))), true)
  })
})

describe('planError', () => {
  it('names the feature that needs pro', () => {
    const body = planError.feature('free', 'mcp')
    assert.equal(body.code, 'plan_required')
    assert.match(body.error, /Claude is part of HomeBase Pro/)
  })

  it('says how much of the month was used', () => {
    const body = planError.quota('free', 'ai_call')
    assert.equal(body.code, 'quota_exceeded')
    assert.equal(body.limit, 10)
    assert.match(body.error, /all 10 AI calls for this month/)
  })

  it('says how many members the plan allows', () => {
    const body = planError.members('free')
    assert.equal(body.code, 'member_limit')
    assert.match(body.error, /allows 2 members/)
  })
})

describe('describePlan', () => {
  it('lists limits and this month\'s usage', () => {
    assert.deepEqual(describePlan('free', { ai_call: 3 }, 2), {
      plan: 'free',
      name: 'Free',
      features: { mcp: false },
      members: { used: 2, limit: 2 },
      usage: { ai_call: { used: 3, limit: 10 } },
    })
  })

  it('sends no member limit for pro and zero for unused kinds', () => {
    const plan = describePlan('pro', {}, 5)
    assert.equal(plan.members.limit, null)
    assert.deepEqual(plan.usage.ai_call, { used: 0, limit: 200 })
  })
})
