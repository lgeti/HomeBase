import { sendError } from './http.js'
import { hasFeature, isOverQuota, monthStartUtc, planError, planOf, usageLimit } from './plans.js'
import { createRateLimiter } from './rateLimit.js'
import { supabase } from './supabase.js'

// Generous for a person using the app (and Claude through MCP), low enough to stop a runaway script
const allowUserRequest = createRateLimiter({ limit: 300, windowMs: 60 * 1000 })

const getUserFromToken = async (authorizationHeader) => {
  if (!authorizationHeader?.startsWith('Bearer ')) return null

  const token = authorizationHeader.replace('Bearer ', '').trim()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) return null
  return data.user
}

export const requireAuth = async (request, response, next) => {
  const user = await getUserFromToken(request.headers.authorization)
  if (!user) {
    return sendError(response, 401, 'Unauthorized')
  }
  if (!allowUserRequest(user.id)) {
    return sendError(response, 429, 'Too many requests; slow down and try again shortly')
  }

  request.user = user
  next()
}

export const requireHouseholdMember = async (request, response, next) => {
  const householdId = request.params.householdId
  const userId = request.user.id

  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .eq('auth_user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return sendError(response, 403, 'Forbidden: User is not an active member of this household')
  }

  request.householdMember = data
  next()
}

// The household a plan check is about: the one in the URL, or else the signed-in person's own (for /mcp)
const loadHousehold = async (request) => {
  if (request.household) return request.household

  let householdId = request.params.householdId
  if (!householdId) {
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('auth_user_id', request.user.id)
      .eq('status', 'active')
      .order('created_at_utc', { ascending: true })
      .limit(1)
      .maybeSingle()
    householdId = membership?.household_id
  }
  if (!householdId) return null

  const { data, error } = await supabase
    .from('households')
    .select('household_id, plan, plan_status, current_period_end')
    .eq('household_id', householdId)
    .single()

  if (error) throw new Error(error.message)
  request.household = data
  return data
}

// The plan the request's household is on right now
export const planForRequest = async (request) => planOf(await loadHousehold(request))

export const countUsage = async (householdId, kind) => {
  const { count, error } = await supabase
    .from('usage_events')
    .select('usage_event_id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .eq('kind', kind)
    .gte('created_at', monthStartUtc())

  if (error) throw new Error(error.message)
  return count ?? 0
}

// Lets the request through only when the household's plan includes the feature; otherwise 402
export const requirePlan = (feature) => async (request, response, next) => {
  const planId = await planForRequest(request)
  if (!hasFeature(planId, feature)) return response.status(402).json(planError.feature(planId, feature))

  request.planId = planId
  next()
}

// Lets the request through while the household has some of this month's allowance left; otherwise 402.
// Only answers that succeed are counted, so a failed or rejected AI call costs nothing.
export const checkQuota = (kind) => async (request, response, next) => {
  const household = await loadHousehold(request)
  const planId = planOf(household)
  const used = await countUsage(household.household_id, kind)
  if (isOverQuota(used, usageLimit(planId, kind))) return response.status(402).json(planError.quota(planId, kind))

  response.on('finish', () => {
    if (response.statusCode >= 400) return
    supabase
      .from('usage_events')
      .insert({ household_id: household.household_id, kind })
      .then(({ error }) => { if (error) console.error('Could not record usage:', error.message) })
  })
  request.planId = planId
  next()
}
