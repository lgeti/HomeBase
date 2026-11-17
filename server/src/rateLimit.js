import { sendError } from './http.js'
import { INTERNAL_HEADER, internalToken } from './runtime.js'

// Keys not seen for a whole window are forgotten once this many are tracked, so memory stays small
const MAX_TRACKED_KEYS = 5000

// Allows `limit` calls per key within `windowMs`. In memory, so on Workers each running copy of the API
// counts on its own: a guard against runaway scripts, not an exact quota.
export const createRateLimiter = ({ limit, windowMs }) => {
  const calls = new Map()

  const forgetIdleKeys = (now) => {
    for (const [key, times] of calls) {
      if (now - times[times.length - 1] >= windowMs) calls.delete(key)
    }
  }

  return (key, now = Date.now()) => {
    const recent = (calls.get(key) || []).filter((time) => now - time < windowMs)
    if (recent.length >= limit) {
      calls.set(key, recent)
      return false
    }
    recent.push(now)
    calls.set(key, recent)
    if (calls.size > MAX_TRACKED_KEYS) forgetIdleKeys(now)
    return true
  }
}

// Cloudflare puts the visitor's address in CF-Connecting-IP; on Node it is the socket's
const addressOf = (request) => request.headers?.['cf-connecting-ip'] || request.ip

// Per-address limit for every request, before sign-in is checked. The MCP tools' own calls (see runtime.js)
// are skipped here because the /mcp request that started them was already counted.
export const limitPerAddress = ({ limit, windowMs }) => {
  const allow = createRateLimiter({ limit, windowMs })
  return (request, response, next) => {
    if (request.headers?.[INTERNAL_HEADER] === internalToken() || allow(addressOf(request))) return next()
    response.set('Retry-After', String(Math.ceil(windowMs / 1000)))
    sendError(response, 429, 'Too many requests; slow down and try again shortly')
  }
}
