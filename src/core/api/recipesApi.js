import { apiRequest } from './client'

const mapRecipe = (recipe) => ({
  id: recipe.recipe_id,
  name: recipe.name,
  ingredients: recipe.ingredients || [],
  steps: recipe.steps || undefined,
  link: recipe.link || undefined,
  isFavourite: Boolean(recipe.is_favourite),
  lastCookedOn: recipe.last_cooked_on || undefined,
})

const recipesPath = (householdId) => `/api/households/${householdId}/recipes`

export const fetchRecipes = async (householdId) => (await apiRequest(recipesPath(householdId))).map(mapRecipe)

export const createRecipe = async (householdId, recipe) =>
  mapRecipe(await apiRequest(recipesPath(householdId), { method: 'POST', body: JSON.stringify(recipe) }))

export const updateRecipe = async (householdId, recipeId, changes) =>
  mapRecipe(await apiRequest(`${recipesPath(householdId)}/${recipeId}`, { method: 'PATCH', body: JSON.stringify(changes) }))

export const markRecipeCooked = async (householdId, recipeId, cookedOn) =>
  mapRecipe(await apiRequest(`${recipesPath(householdId)}/${recipeId}/cooked`, { method: 'POST', body: JSON.stringify({ cookedOn }) }))

export const deleteRecipe = (householdId, recipeId) =>
  apiRequest(`${recipesPath(householdId)}/${recipeId}`, { method: 'DELETE' })
