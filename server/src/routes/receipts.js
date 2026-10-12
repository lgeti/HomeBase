import express from 'express'
import { AiError, generateJson } from '../ai/gemini.js'
import { isRealDate } from '../chores.js'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { parseReceipt, RECEIPT_PROMPT, RECEIPT_SCHEMA, validateReceiptFile } from '../receipts.js'
import { createRateLimiter } from '../recipeSuggestions.js'
import { todayUtc } from '../recurring.js'

const router = express.Router()

// 20 receipt scans per household per hour keeps well inside the free AI quota
const allowScan = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 })

// Reads a receipt (a photo or a PDF) and returns what is on it. Nothing is saved, and the file is not kept or logged.
// It has its own body limit because files are bigger than the 1 MB the other routes accept.
// The file arrives as { file } (older app versions send { image }).
router.post(
  '/api/households/:householdId/receipt-scan',
  express.json({ limit: '8mb' }),
  requireAuth,
  requireHouseholdMember,
  async (request, response) => {
    const { householdId } = request.params
    const file = request.body?.file ?? request.body?.image
    const validationError = validateReceiptFile(file)
    if (validationError) return sendError(response, 400, validationError)
    if (!allowScan(householdId)) return sendError(response, 429, 'That is a lot of receipts for one hour; try again later')

    const today = isRealDate(request.body?.today) ? request.body.today : todayUtc()
    try {
      const answer = await generateJson({
        prompt: RECEIPT_PROMPT,
        schema: RECEIPT_SCHEMA,
        images: [{ mimeType: file.mimeType, data: file.data }],
        temperature: 0,
      })
      const receipt = parseReceipt(answer, today)
      if (!receipt) return sendError(response, 422, 'That could not be read as a receipt; fill in the expense by hand')
      response.json(receipt)
    } catch (error) {
      if (error instanceof AiError) return sendError(response, error.status, error.message)
      throw error
    }
  },
)

export default router
