// Matching recipes against the fridge and ranking them. `today` is a local 'YYYY-MM-DD'.
import { daysUntil } from '../../core/utils/dates.js'
import { freshness } from './fridge.js'

// Assumed to be in the cupboard, so a recipe never counts them as missing
const STAPLES = new Set(['salt', 'pepper', 'water', 'oil'])

// Words that say how much or how, not what
const IGNORED_WORDS = new Set([
  'and', 'or', 'of', 'the', 'for', 'with', 'to', 'taste', 'some', 'optional', 'serving', 'about',
  'fresh', 'chopped', 'sliced', 'diced', 'grated', 'minced', 'large', 'small', 'medium', 'half', 'whole',
  'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
  'pack', 'packs', 'piece', 'pieces', 'pinch', 'clove', 'cloves', 'can', 'cans', 'slice', 'slices',
  'bunch', 'handful', 'jar', 'tin', 'bottle', 'gram', 'grams', 'litre', 'liter', 'kilo',
])

// "tomatoes" -> "tomato", "berries" -> "berry", "eggs" -> "egg"
const singular = (word) => {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`
  if (word.endsWith('oes')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1)
  return word
}

// The words in an ingredient or fridge item that name the food itself
export const foodWords = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, ' ')
    .split(' ')
    .filter((word) => word.length >= 3 && !IGNORED_WORDS.has(word))
    .map(singular)

export const isStaple = (ingredient) => {
  const words = foodWords(ingredient)
  return words.length > 0 && words.every((word) => STAPLES.has(word))
}

// The fridge item an ingredient can come from, if any: they share a food word ("200 g ham" and "half a pack of ham")
export const findInFridge = (ingredient, fridgeItems) => {
  const words = new Set(foodWords(ingredient))
  if (words.size === 0) return null
  return fridgeItems.find((item) => foodWords(item.name).some((word) => words.has(word))) || null
}

// What the fridge has for a recipe, what is missing, and how high it ranks
export const analyseRecipe = (recipe, fridgeItems, today) => {
  const have = []
  const missing = []
  for (const ingredient of recipe.ingredients) {
    if (isStaple(ingredient)) continue
    const item = findInFridge(ingredient, fridgeItems)
    if (item) have.push({ ingredient, item })
    else missing.push(ingredient)
  }

  const usesSoon = [...new Map(
    have.filter(({ item }) => ['expired', 'soon'].includes(freshness(item, today))).map(({ item }) => [item.id, item])
  ).values()]

  const daysSinceCooked = recipe.lastCookedOn ? -daysUntil(recipe.lastCookedOn, today) : null
  const cookedPenalty = daysSinceCooked === null ? 0 : daysSinceCooked <= 2 ? 4 : daysSinceCooked <= 7 ? 2 : 0

  // Using up food that is about to go off matters most (already expired a little more), then needing little shopping
  const urgency = usesSoon.reduce((total, item) => total + (freshness(item, today) === 'expired' ? 5 : 4), 0)
  const score = urgency + have.length - missing.length * 2 + (recipe.isFavourite ? 2 : 0) - cookedPenalty

  return { recipe, have, missing, usesSoon, score, canMake: have.length > 0 && missing.length === 0 }
}

// Best first: highest score, then fewest missing, then by name
export const rankRecipes = (recipes, fridgeItems, today) =>
  recipes
    .map((recipe) => analyseRecipe(recipe, fridgeItems, today))
    .sort((a, b) => b.score - a.score || a.missing.length - b.missing.length || a.recipe.name.localeCompare(b.recipe.name))

export const haveLabel = ({ have, missing }) => {
  const total = have.length + missing.length
  if (total === 0) return 'No ingredients listed'
  if (missing.length === 0) return 'You have everything'
  return `You have ${have.length} of ${total}`
}

export const initialRecipeForm = (recipe) => ({
  name: recipe?.name ?? '',
  ingredients: (recipe?.ingredients ?? []).join('\n'),
  steps: recipe?.steps ?? '',
  link: recipe?.link ?? '',
  isFavourite: recipe?.isFavourite ?? false,
})

export const recipeFormToBody = (form) => ({
  name: form.name.trim(),
  ingredients: form.ingredients.split('\n').map((line) => line.trim()).filter(Boolean),
  steps: form.steps.trim(),
  link: form.link.trim(),
  isFavourite: form.isFavourite,
})

// "Cooked today", "Cooked yesterday", "Cooked 5 days ago", or null if never
export const cookedLabel = (recipe, today) => {
  if (!recipe.lastCookedOn) return null
  const days = -daysUntil(recipe.lastCookedOn, today)
  if (days <= 0) return 'Cooked today'
  if (days === 1) return 'Cooked yesterday'
  return `Cooked ${days} days ago`
}
