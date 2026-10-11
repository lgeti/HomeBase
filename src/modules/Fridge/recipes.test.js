import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyseRecipe, cookedLabel, findInFridge, foodWords, haveLabel, initialRecipeForm, isStaple, rankRecipes, recipeFormToBody } from './recipes.js'

const today = '2026-10-11'
const fridge = [
  { id: 'ham', name: 'Half a pack of ham', expiresOn: '2026-10-12' },
  { id: 'eggs', name: 'Eggs', expiresOn: '2026-10-25' },
  { id: 'tomatoes', name: 'Cherry tomatoes' },
  { id: 'yogurt', name: 'Greek yogurt', expiresOn: '2026-10-09' },
]
const recipe = (name, ingredients, extra = {}) => ({ id: name, name, ingredients, ...extra })

describe('foodWords', () => {
  it('keeps the food and drops amounts, units and plurals', () => {
    assert.deepEqual(foodWords('200 g sliced ham'), ['ham'])
    assert.deepEqual(foodWords('2 large eggs'), ['egg'])
    assert.deepEqual(foodWords('3 tomatoes, chopped'), ['tomato'])
    assert.deepEqual(foodWords('1 cup berries'), ['berry'])
    assert.deepEqual(foodWords('Čebula'), ['čebula'])
  })
})

describe('findInFridge', () => {
  it('matches loosely worded fridge items', () => {
    assert.equal(findInFridge('200 g ham', fridge)?.id, 'ham')
    assert.equal(findInFridge('2 eggs', fridge)?.id, 'eggs')
    assert.equal(findInFridge('a handful of tomatoes', fridge)?.id, 'tomatoes')
    assert.equal(findInFridge('basil', fridge), null)
  })
})

describe('isStaple', () => {
  it('treats salt, pepper, water and oil as always there', () => {
    assert.equal(isStaple('Salt and pepper'), true)
    assert.equal(isStaple('2 tbsp olive oil'), false)
    assert.equal(isStaple('oil'), true)
  })
})

describe('analyseRecipe', () => {
  it('lists what you have, what is missing, and what should be used soon', () => {
    const result = analyseRecipe(recipe('Omelette', ['2 eggs', '50 g ham', 'salt', 'chives']), fridge, today)
    assert.deepEqual(result.have.map((h) => h.item.id), ['eggs', 'ham'])
    assert.deepEqual(result.missing, ['chives'])
    assert.deepEqual(result.usesSoon.map((i) => i.id), ['ham'])
    assert.equal(result.canMake, false)
    assert.equal(haveLabel(result), 'You have 2 of 3')
  })

  it('can make a recipe when only staples are not in the fridge', () => {
    const result = analyseRecipe(recipe('Boiled eggs', ['eggs', 'water', 'salt']), fridge, today)
    assert.equal(result.canMake, true)
    assert.equal(haveLabel(result), 'You have everything')
  })
})

describe('rankRecipes', () => {
  it('puts recipes that use food about to go off first', () => {
    const ranked = rankRecipes([
      recipe('Egg salad', ['eggs', 'tomatoes']),
      recipe('Tzatziki', ['greek yogurt', 'cucumber']),
      recipe('Ham sandwich', ['ham', 'bread']),
    ], fridge, today)
    assert.deepEqual(ranked.map((r) => r.recipe.name), ['Tzatziki', 'Ham sandwich', 'Egg salad'])
  })

  it('ranks fewer missing ingredients and favourites higher', () => {
    const ranked = rankRecipes([
      recipe('Pancakes', ['eggs', 'flour', 'milk']),
      recipe('Fried eggs', ['eggs']),
      recipe('French toast', ['eggs', 'bread'], { isFavourite: true }),
    ], fridge, today)
    assert.deepEqual(ranked.map((r) => r.recipe.name), ['Fried eggs', 'French toast', 'Pancakes'])
  })

  it('pushes recently cooked recipes down', () => {
    const ranked = rankRecipes([
      recipe('Fried eggs', ['eggs'], { lastCookedOn: '2026-10-10' }),
      recipe('Scrambled eggs', ['eggs']),
    ], fridge, today)
    assert.deepEqual(ranked.map((r) => r.recipe.name), ['Scrambled eggs', 'Fried eggs'])
  })
})

describe('recipe form', () => {
  it('edits ingredients as one per line', () => {
    const form = initialRecipeForm(recipe('Soup', ['leek', '2 potatoes'], { link: 'https://a.example', isFavourite: true }))
    assert.equal(form.ingredients, 'leek\n2 potatoes')
    assert.deepEqual(recipeFormToBody({ ...form, ingredients: 'leek\n\n 2 potatoes \n', steps: ' Boil ' }), {
      name: 'Soup', ingredients: ['leek', '2 potatoes'], steps: 'Boil', link: 'https://a.example', isFavourite: true,
    })
  })
})

describe('cookedLabel', () => {
  it('says when it was last cooked', () => {
    assert.equal(cookedLabel({ lastCookedOn: '2026-10-11' }, today), 'Cooked today')
    assert.equal(cookedLabel({ lastCookedOn: '2026-10-10' }, today), 'Cooked yesterday')
    assert.equal(cookedLabel({ lastCookedOn: '2026-10-01' }, today), 'Cooked 10 days ago')
    assert.equal(cookedLabel({}, today), null)
  })
})
