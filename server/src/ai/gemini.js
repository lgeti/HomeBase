// The one place that talks to the AI provider (Google Gemini). Swapping providers means changing this file.
// Needs GEMINI_API_KEY in the server's environment; GEMINI_MODEL picks a model (default: the latest Flash-Lite, fast and on the free tier).

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 30000
const RETRY_DELAY_MS = 2000

export class AiError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

export const isAiConfigured = () => Boolean(process.env.GEMINI_API_KEY)

// Asks the model for JSON matching `schema` (an OpenAPI-style schema) and returns it parsed.
// `images` ([{ mimeType, data }] with base64 data; photos or PDFs) are sent along for the model to read.
// `timeoutMs` is how long to wait for one answer; long answers (a full receipt) need more than the default.
export const generateJson = async ({ prompt, schema, images = [], temperature = 0.8, timeoutMs = TIMEOUT_MS }) => {
  if (!isAiConfigured()) throw new AiError('AI features are not set up yet (no AI key on the server)', 503)

  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'
  const request = () => fetch(`${API_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [...images.map((image) => ({ inlineData: image })), { text: prompt }] }],
      generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
    }),
  })

  let response
  try {
    response = await request()
    // "High demand" from the free tier usually passes within seconds, so try once more
    if (response.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      response = await request()
    }
  } catch {
    throw new AiError('The AI service did not answer; try again in a moment')
  }

  if (response.status === 429) throw new AiError('Too many AI requests for now; try again in a minute', 429)
  if (response.status === 503) throw new AiError('The AI service is busy right now; try again in a minute', 503)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error(`Gemini request failed (${response.status}):`, detail.slice(0, 500))
    throw new AiError('The AI service could not answer right now')
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
  try {
    return JSON.parse(text)
  } catch {
    throw new AiError('The AI answer could not be read; try again')
  }
}
