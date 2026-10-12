// Live updates: after a change, tell the household's devices which section changed, so they reload it.
// The message carries no data; the apps fetch what changed through the API as usual.

const CHANGING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

// What each kind of change touches. Using up a fridge item can also put it on a shopping list.
const SECTIONS = [
  { pattern: /^fridge-items\/[^/]+\/used-up$/, sections: ['fridge', 'shopping'] },
  { pattern: /^shopping-lists\/[^/]+\/import-preview$/, sections: [] },
  { pattern: /^(shopping-lists|shopping-items)(\/|$)/, sections: ['shopping'] },
  { pattern: /^expenses(\/|$)/, sections: ['expenses'] },
  { pattern: /^fridge-items(\/|$)/, sections: ['fridge'] },
  { pattern: /^recipes(\/|$)/, sections: ['recipes'] },
  { pattern: /^chores(\/|$)/, sections: ['chores'] },
  { pattern: /^(inventory-groups|inventory-items)(\/|$)/, sections: ['inventory'] },
  { pattern: /^(members|invitations)(\/|$)/, sections: ['household'] },
]

// { householdId, sections } for a request that changes household data, or null.
// Reading, suggesting recipes and scanning receipts change nothing, so they are not announced.
export const changeFromRequest = (method, path) => {
  if (!CHANGING_METHODS.has(method)) return null
  const match = path.match(/^\/api\/households\/([0-9a-f-]{36})\/(.+?)\/?$/i)
  if (!match) return null
  const [, householdId, rest] = match
  const sections = SECTIONS.find((entry) => entry.pattern.test(rest))?.sections || []
  return sections.length ? { householdId: householdId.toLowerCase(), sections } : null
}

// Each open copy of the app sends a random id, so it can ignore the news about its own changes
export const cleanClientId = (value) => (typeof value === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : null)

export const householdTopic = (householdId) => `household:${householdId}`

// Sends the message through Supabase Realtime's broadcast API. A failure only means other devices
// update a little later (when they next open the app), so it is logged, never thrown.
export const announceChange = async ({ householdId, sections, clientId }) => {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ topic: householdTopic(householdId), event: 'changed', payload: { sections, clientId }, private: true }],
      }),
    })
    if (!response.ok) console.error(`Live update failed (${response.status}):`, (await response.text()).slice(0, 300))
  } catch (error) {
    console.error('Live update failed:', error.message)
  }
}

// Express middleware: once a change has succeeded, announce it to the household
export const liveUpdates = (request, response, next) => {
  const change = changeFromRequest(request.method, request.path)
  if (change) {
    response.on('finish', () => {
      if (response.statusCode < 400) announceChange({ ...change, clientId: cleanClientId(request.get('x-homebase-client')) })
    })
  }
  next()
}
