// The two things Node and Cloudflare Workers do differently: how the MCP tools reach this same API,
// and how work that outlives a request (like live updates) is kept running. worker.js swaps in the Workers way.
import { randomUUID } from 'node:crypto'

// Marks the MCP tools' own calls, so the per-address limit skips them (the /mcp request was already counted)
// Made on first use: Workers allow no random values while the code is still loading.
export const INTERNAL_HEADER = 'x-homebase-internal'
let token = null
export const internalToken = () => {
  token ??= randomUUID()
  return token
}

let sendToApi = (path, init) => fetch(`http://127.0.0.1:${Number(process.env.PORT || 3000)}${path}`, init)
let keepRunning = () => {}

export const configureRuntime = ({ fetchApi, waitUntil }) => {
  sendToApi = fetchApi
  keepRunning = waitUntil
}

export const fetchApi = (path, init = {}) =>
  sendToApi(path, { ...init, headers: { ...init.headers, [INTERNAL_HEADER]: internalToken() } })

// Workers stop a request's leftover work once the answer is sent, unless told to wait for it
export const runInBackground = (promise) => {
  keepRunning(promise)
  return promise
}
