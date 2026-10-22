import { sendError } from './http.js'
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
