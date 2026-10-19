import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { sendError } from '../http.js'
import { createMcpServer } from '../mcp.js'
import { supabase } from '../supabase.js'

const router = express.Router()

// The MCP tools call this same API over the loopback address, as the signed-in person
const apiBaseUrl = `http://127.0.0.1:${Number(process.env.PORT || 3000)}`

// The address Claude reaches the API at. Set PUBLIC_API_URL in production, where a proxy sits in front.
const publicUrl = (request) => process.env.PUBLIC_API_URL
  || `${request.get('x-forwarded-proto') || request.protocol}://${request.get('host')}`

const metadataPath = '/.well-known/oauth-protected-resource'

// Tells Claude that sign-in goes through the app's Supabase Auth (its OAuth 2.1 server).
// Served at both the plain path and the /mcp path, since clients look in either place.
router.get([metadataPath, `${metadataPath}/mcp`], (request, response) => {
  response.json({
    resource: `${publicUrl(request)}/mcp`,
    authorization_servers: [`${process.env.SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ['header'],
    resource_name: 'HomeBase',
  })
})

const callApi = (authorization) => async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(data?.error || `HomeBase answered with status ${response.status}`)
  return data
}

// Stateless: every request brings its token and gets a fresh server, so nothing is kept between calls
router.post('/mcp', async (request, response) => {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null
  const { data } = token ? await supabase.auth.getUser(token) : { data: null }

  if (!data?.user) {
    response.set('WWW-Authenticate', `Bearer resource_metadata="${publicUrl(request)}${metadataPath}/mcp"`)
    return sendError(response, 401, 'Sign in to HomeBase first')
  }

  const server = createMcpServer(callApi(authorization))
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  response.on('close', () => {
    transport.close()
    server.close()
  })

  try {
    await server.connect(transport)
    await transport.handleRequest(request, response, request.body)
  } catch (error) {
    console.error('MCP request failed:', error)
    if (!response.headersSent) sendError(response, 500, 'MCP request failed')
  }
})

// Without sessions there is no event stream to open and nothing to close
router.all('/mcp', (request, response) => {
  response.set('Allow', 'POST')
  sendError(response, 405, 'Use POST')
})

export default router
