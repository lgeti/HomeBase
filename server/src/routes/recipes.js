import express from 'express'
import { sendError } from '../http.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { normalizeRecipe, validateCookedOn, validateRecipe } from '../recipes.js'
import { supabase } from '../supabase.js'

const router = express.Router()
const base = '/api/households/:householdId/recipes'

const findRecipe = (householdId, recipeId) =>
  supabase
    .from('recipes')
    .select('*')
    .eq('household_id', householdId)
    .eq('recipe_id', recipeId)
    .is('deleted_at_utc', null)
    .maybeSingle()

// The household's recipes by name; the app ranks them against the fridge
router.get(base, requireAuth, requireHouseholdMember, async (request, response) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('household_id', request.params.householdId)
    .is('deleted_at_utc', null)
    .order('name', { ascending: true })

  if (error) return sendError(response, 500, error.message)
  response.json(data)
})

router.post(base, requireAuth, requireHouseholdMember, async (request, response) => {
  const recipe = normalizeRecipe(request.body)
  const validationError = validateRecipe(recipe)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      ...recipe,
      household_id: request.params.householdId,
      created_by_member_id: request.householdMember.household_member_id,
    })
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.status(201).json(data)
})

// Accepts any subset of the fields, so the star can send just { isFavourite }
router.patch(`${base}/:recipeId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, recipeId } = request.params

  const { data: existing, error: existingError } = await findRecipe(householdId, recipeId)
  if (existingError) return sendError(response, 500, existingError.message)
  if (!existing) return sendError(response, 404, 'Recipe not found')

  const recipe = normalizeRecipe(request.body, existing)
  const validationError = validateRecipe(recipe)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('recipes')
    .update({ ...recipe, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('recipe_id', recipeId)
    .is('deleted_at_utc', null)
    .select()
    .single()

  if (error) return sendError(response, 400, error.message)
  response.json(data)
})

// "Cooked it": remembers the day, so recently cooked recipes rank lower
router.post(`${base}/:recipeId/cooked`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, recipeId } = request.params
  const { cookedOn } = request.body
  const validationError = validateCookedOn(cookedOn)
  if (validationError) return sendError(response, 400, validationError)

  const { data, error } = await supabase
    .from('recipes')
    .update({ last_cooked_on: cookedOn, updated_at_utc: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('recipe_id', recipeId)
    .is('deleted_at_utc', null)
    .select()
    .maybeSingle()

  if (error) return sendError(response, 400, error.message)
  if (!data) return sendError(response, 404, 'Recipe not found')
  response.json(data)
})

router.delete(`${base}/:recipeId`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { error } = await supabase
    .from('recipes')
    .update({ deleted_at_utc: new Date().toISOString() })
    .eq('household_id', request.params.householdId)
    .eq('recipe_id', request.params.recipeId)
    .is('deleted_at_utc', null)

  if (error) return sendError(response, 400, error.message)
  response.status(204).send()
})

export default router
