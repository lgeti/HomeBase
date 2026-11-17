// Runs the API on Cloudflare Workers, which answer at once instead of waking up like a sleeping server.
// Express runs on the Workers Node.js bridge: the app listens on a port, and each request is handed to it.
import { handleAsNodeRequest } from 'cloudflare:node'
import { waitUntil } from 'cloudflare:workers'
import { app } from './app.js'
import { configureRuntime } from './runtime.js'

const PORT = 3000

app.listen(PORT)

// The MCP tools' calls go straight to the app inside this Worker, without leaving it
configureRuntime({
  fetchApi: (path, init) => handleAsNodeRequest(PORT, new Request(`http://internal${path}`, init)),
  waitUntil,
})

export default {
  fetch: (request) => handleAsNodeRequest(PORT, request),
}
