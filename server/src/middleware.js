import { sendError } from './http.js'
import { supabase } from './supabase.js'

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
