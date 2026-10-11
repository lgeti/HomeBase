import { useCallback, useEffect, useState } from 'react'
import { createRecipe, deleteRecipe, fetchRecipes, markRecipeCooked, updateRecipe } from '../api/recipesApi'

export const useRecipesApi = (household) => {
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const householdId = household?.household_id

  const reload = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError('')

    try {
      setRecipes(await fetchRecipes(householdId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    reload()
  }, [reload])

  const replaceRecipe = (recipe) => setRecipes((current) => current.map((existing) => (existing.id === recipe.id ? recipe : existing)))

  const addRecipe = async (body) => {
    const recipe = await createRecipe(householdId, body)
    setRecipes((current) => [...current, recipe])
    return recipe
  }

  const editRecipe = async (recipeId, changes) => {
    const recipe = await updateRecipe(householdId, recipeId, changes)
    replaceRecipe(recipe)
    return recipe
  }

  const markCooked = async (recipeId, cookedOn) => replaceRecipe(await markRecipeCooked(householdId, recipeId, cookedOn))

  const removeRecipe = async (recipeId) => {
    await deleteRecipe(householdId, recipeId)
    setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId))
  }

  return { recipes, isLoading, error, reload, addRecipe, editRecipe, markCooked, removeRecipe }
}
