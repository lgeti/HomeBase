// Recipe rules. Pure functions so they can be tested without a database.
import { isRealDate } from './chores.js'
import { normalizeLink } from './shopping.js'

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')
const optionalText = (value) => trimmed(value) || null

// Ingredients arrive as a list or as text with one per line; blank lines are dropped
export const normalizeIngredients = (value) => {
  const lines = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : []
  return lines.map((line) => (typeof line === 'string' ? line.replace(/^[\s\-*•]+/, '').trim() : '')).filter(Boolean)
}

// Builds the columns for a recipe from a request body. For an update, `existing` supplies every
// field the body leaves out.
export const normalizeRecipe = (body, existing = {}) => {
  const has = (key) => Object.hasOwn(body, key)
  return {
    name: has('name') ? trimmed(body.name) : existing.name,
    ingredients: has('ingredients') ? normalizeIngredients(body.ingredients) : existing.ingredients ?? [],
    steps: has('steps') ? optionalText(body.steps) : existing.steps ?? null,
    link: has('link') ? normalizeLink(body.link) : existing.link ?? null,
    is_favourite: has('isFavourite') ? Boolean(body.isFavourite) : Boolean(existing.is_favourite),
  }
}

export const validateRecipe = (recipe) => {
  if (!recipe.name) return 'Enter a recipe name'
  if (recipe.name.length > 120) return 'Recipe names can be at most 120 characters'
  if (recipe.ingredients.length > 50) return 'A recipe can have at most 50 ingredients'
  if (recipe.ingredients.some((ingredient) => ingredient.length > 120)) return 'Each ingredient can be at most 120 characters'
  if (recipe.steps && recipe.steps.length > 5000) return 'Steps can be at most 5000 characters'
  if (recipe.link) {
    try {
      const url = new URL(recipe.link)
      if (!['http:', 'https:'].includes(url.protocol) || recipe.link.length > 2000) return 'Link must be a web address'
    } catch {
      return 'Link must be a web address'
    }
  }
  return null
}

export const validateCookedOn = (value) => (isRealDate(value) ? null : 'cookedOn must be a real date in YYYY-MM-DD format')
