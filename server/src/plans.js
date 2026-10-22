// What each plan allows. The one place limits are set: the API enforces them and the app shows them.
// Pure functions so they can be tested without a database.

export const PLANS = {
  free: { name: 'Free', members: 2, aiCallsPerMonth: 10, mcp: false },
  pro: { name: 'Pro', members: Infinity, aiCallsPerMonth: 200, mcp: true },
}

// Features a plan switches on or off, and usage counted per month against a limit
export const FEATURES = { mcp: 'Using HomeBase from Claude' }
export const USAGE_KINDS = { ai_call: { limit: 'aiCallsPerMonth', label: 'AI calls' } }

// Stripe statuses that still count as paid. No status means pro was granted by hand.
const PAID_STATUSES = ['active', 'trialing', 'past_due']

// The plan a household gets right now: pro only while it is paid for
export const planOf = (household) => {
  if (household?.plan !== 'pro') return 'free'
  if (household.plan_status && !PAID_STATUSES.includes(household.plan_status)) return 'free'
  return 'pro'
}

export const hasFeature = (planId, feature) => PLANS[planId]?.[feature] === true

export const usageLimit = (planId, kind) => PLANS[planId]?.[USAGE_KINDS[kind]?.limit] ?? 0

// Usage counts per calendar month in UTC
export const monthStartUtc = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

export const isOverQuota = (used, limit) => used >= limit

// Whether one more member fits. Members who were removed do not count; pending ones do, since they hold a place.
// Inviting an existing pending member does not add a place, so only joined members count against the cap then.
export const memberFits = (planId, members, { existingPending = false } = {}) => {
  const counted = members.filter((member) => (existingPending ? member.status === 'active' : member.status !== 'removed'))
  return counted.length < PLANS[planId].members
}

const upgradeHint = 'Upgrade to Pro for more.'

// The body of a 402 answer: a code the app can act on and a message people can read
export const planError = {
  feature: (planId, feature) => ({
    code: 'plan_required',
    feature,
    plan: planId,
    error: `${FEATURES[feature] || 'This'} is part of HomeBase Pro.`,
  }),
  quota: (planId, kind) => ({
    code: 'quota_exceeded',
    kind,
    plan: planId,
    limit: usageLimit(planId, kind),
    error: `Your household has used all ${usageLimit(planId, kind)} ${USAGE_KINDS[kind]?.label || kind} for this month. ${upgradeHint}`,
  }),
  members: (planId) => ({
    code: 'member_limit',
    plan: planId,
    limit: PLANS[planId].members,
    error: `The ${PLANS[planId].name} plan allows ${PLANS[planId].members} members. ${upgradeHint}`,
  }),
}

// Plan, limits and this month's usage, for the app's Plan & usage section. Infinity becomes null in JSON.
export const describePlan = (planId, usage, memberCount) => ({
  plan: planId,
  name: PLANS[planId].name,
  features: { mcp: PLANS[planId].mcp },
  members: { used: memberCount, limit: Number.isFinite(PLANS[planId].members) ? PLANS[planId].members : null },
  usage: Object.fromEntries(Object.keys(USAGE_KINDS).map((kind) => [kind, { used: usage[kind] ?? 0, limit: usageLimit(planId, kind) }])),
})
