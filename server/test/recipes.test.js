import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeIngredients, normalizeRecipe, validateCookedOn, validateRecipe } from '../src/recipes.js'

describe('normalizeIngredients', () => {
  it('takes one ingredient per line and drops bullets and blank lines', () => {
    assert.deepEqual(normalizeIngredients('- 2 eggs\n\n• 200 g ham \r\n* salt'), ['2 eggs', '200 g ham', 'salt'])
    assert.deepEqual(normalizeIngredients([' milk ', '', 42]), ['milk'])
    assert.deepEqual(normalizeIngredients(undefined), [])
  })
})

describe('normalizeRecipe', () => {
  it('builds a new recipe', () => {
    assert.deepEqual(normalizeRecipe({ name: ' Omelette ', ingredients: '2 eggs\nham', link: 'example.com/omelette' }), {
      name: 'Omelette', ingredients: ['2 eggs', 'ham'], steps: null, link: 'https://example.com/omelette', is_favourite: false,
    })
  })

  it('keeps fields the body leaves out', () => {
    const existing = { name: 'Soup', ingredients: ['leek'], steps: 'Boil', link: null, is_favourite: true }
    assert.deepEqual(normalizeRecipe({ isFavourite: false }, existing), { ...existing, is_favourite: false })
  })
})

describe('validateRecipe', () => {
  const valid = { name: 'Soup', ingredients: ['leek'], steps: null, link: null, is_favourite: false }

  it('requires a name and keeps lists and text in bounds', () => {
    assert.equal(validateRecipe(valid), null)
    assert.match(validateRecipe({ ...valid, name: '' }), /Enter a recipe name/)
    assert.match(validateRecipe({ ...valid, ingredients: Array(51).fill('x') }), /50 ingredients/)
    assert.match(validateRecipe({ ...valid, ingredients: ['x'.repeat(121)] }), /120/)
    assert.match(validateRecipe({ ...valid, steps: 'x'.repeat(5001) }), /5000/)
  })

  it('only accepts web links', () => {
    assert.match(validateRecipe({ ...valid, link: 'javascript:alert(1)' }), /web address/)
    assert.equal(validateRecipe({ ...valid, link: 'https://www.bbcgoodfood.com/recipes/omelette' }), null)
  })
})

describe('validateCookedOn', () => {
  it('needs a real date', () => {
    assert.equal(validateCookedOn('2026-10-11'), null)
    assert.match(validateCookedOn('2026-13-01'), /real date/)
  })
})
