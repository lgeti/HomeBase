import express from 'express'
import { AiError, generateJson } from '../ai/gemini.js'
import { isRealDate } from '../chores.js'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { buildSuggestionPrompt, createRateLimiter, parseSuggestions, SUGGESTION_SCHEMA } from '../recipeSuggestions.js'
import { todayUtc } from '../recurring.js'
import { supabase } from '../supabase.js'

const router = express.Router()

// 10 suggestion requests per household per hour keeps well inside the free AI quota
const allowSuggestion = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 })

// A few recipe ideas from what is in the fridge. Only item names, quantities and expiry go to the AI.
router.post('/api/households/:householdId/recipe-suggestions', requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId } = request.params
  const today = isRealDate(request.body?.today) ? request.body.today : todayUtc()

  const { data: fridgeItems, error: fridgeError } = await supabase
    .from('fridge_items')
    .select('name, quantity, expires_on')
    .eq('household_id', householdId)
    .is('deleted_at_utc', null)
    .order('expires_on', { ascending: true, nullsFirst: false })
    .limit(60)

  if (fridgeError) return sendError(response, 500, fridgeError.message)
  if (fridgeItems.length === 0) return sendError(response, 400, 'Add something to the fridge first')

  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('name')
    .eq('household_id', householdId)
    .is('deleted_at_utc', null)
    .limit(100)

  if (recipesError) return sendError(response, 500, recipesError.message)
  if (!allowSuggestion(householdId)) return sendError(response, 429, 'That is a lot of suggestions for one hour; try again later')

  try {
    const answer = await generateJson({
      prompt: buildSuggestionPrompt({ fridgeItems, savedRecipeNames: recipes.map((recipe) => recipe.name), today }),
      schema: SUGGESTION_SCHEMA,
    })
    const suggestions = parseSuggestions(answer)
    if (suggestions.length === 0) return sendError(response, 502, 'No suggestions came back; try again')
    response.json({ suggestions })
  } catch (error) {
    if (error instanceof AiError) return sendError(response, error.status, error.message)
    throw error
  }
})

export default router
