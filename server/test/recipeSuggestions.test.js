import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSuggestionPrompt, createRateLimiter, daysBetween, describeFridge, parseSuggestions, SUGGESTION_COUNT } from '../src/recipeSuggestions.js'

const today = '2026-10-11'
const fridge = [
  { name: 'Half a pack of ham', quantity: null, expires_on: '2026-10-12' },
  { name: 'Eggs', quantity: '6', expires_on: '2026-10-25' },
  { name: 'Greek yogurt', quantity: null, expires_on: '2026-10-09' },
  { name: '  Cherry   tomatoes ', quantity: null, expires_on: null },
]

describe('daysBetween', () => {
  it('counts whole days either way', () => {
    assert.equal(daysBetween(today, '2026-10-12'), 1)
    assert.equal(daysBetween(today, '2026-10-09'), -2)
  })
})

describe('describeFridge', () => {
  it('lists items with quantities and how urgent they are', () => {
    assert.equal(describeFridge(fridge, today), [
      '- Half a pack of ham - expires in 1 day, use soon',
      '- Eggs (6)',
      '- Greek yogurt - expired, use first if still good',
      '- Cherry tomatoes',
    ].join('\n'))
  })
})

describe('buildSuggestionPrompt', () => {
  it('asks for English recipes, mentions saved ones to avoid, and nothing about people', () => {
    const prompt = buildSuggestionPrompt({ fridgeItems: fridge, savedRecipeNames: ['Ham omelette'], today })
    assert.match(prompt, /in English/)
    assert.match(prompt, new RegExp(`Suggest ${SUGGESTION_COUNT} different`))
    assert.match(prompt, /already has: Ham omelette/)
    assert.match(prompt, /Half a pack of ham - expires in 1 day/)
  })

  it('leaves the saved-recipes line out when there are none', () => {
    assert.doesNotMatch(buildSuggestionPrompt({ fridgeItems: fridge, savedRecipeNames: [], today }), /already has/)
  })
})

describe('parseSuggestions', () => {
  it('keeps well-formed suggestions, trimmed and capped', () => {
    const answer = {
      suggestions: [
        { name: ' Ham and egg muffins ', ingredients: ['3 eggs', ' 50 g ham ', ''], steps: '1. Mix\n2. Bake', usesFromFridge: ['Eggs', 'Half a pack of ham'] },
        { name: '', ingredients: ['x'], steps: '', usesFromFridge: [] },
        { name: 'No ingredients', ingredients: [], steps: '', usesFromFridge: [] },
        { name: 'Tzatziki', ingredients: ['greek yogurt', 'cucumber'], steps: 'Mix', usesFromFridge: 'not a list' },
        { name: 'Shakshuka', ingredients: ['eggs', 'tomatoes'], steps: 'Cook', usesFromFridge: [] },
        { name: 'Fourth', ingredients: ['eggs'], steps: 'Cook', usesFromFridge: [] },
      ],
    }
    assert.deepEqual(parseSuggestions(answer), [
      { name: 'Ham and egg muffins', ingredients: ['3 eggs', '50 g ham'], steps: '1. Mix\n2. Bake', usesFromFridge: ['Eggs', 'Half a pack of ham'] },
      { name: 'Tzatziki', ingredients: ['greek yogurt', 'cucumber'], steps: 'Mix', usesFromFridge: [] },
      { name: 'Shakshuka', ingredients: ['eggs', 'tomatoes'], steps: 'Cook', usesFromFridge: [] },
    ])
  })

  it('maps "uses" back to the fridge names, dropping copied quantities and notes', () => {
    const answer = {
      suggestions: [{
        name: 'Quiche cups',
        ingredients: ['eggs'],
        steps: '',
        usesFromFridge: ['Half a pack of ham - expires in 1 day, use soon', 'eggs (6)', 'Eggs', 'Butter (2 sticks)'],
      }],
    }
    assert.deepEqual(parseSuggestions(answer, ['Half a pack of ham', 'Eggs'])[0].usesFromFridge, ['Half a pack of ham', 'Eggs', 'Butter'])
  })

  it('copes with an answer of the wrong shape', () => {
    assert.deepEqual(parseSuggestions(null), [])
    assert.deepEqual(parseSuggestions({ suggestions: 'nope' }), [])
  })
})

describe('createRateLimiter', () => {
  it('allows a few calls per window per household', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 })
    assert.equal(allow('h1', 0), true)
    assert.equal(allow('h1', 10), true)
    assert.equal(allow('h1', 20), false)
    assert.equal(allow('h2', 20), true)
    assert.equal(allow('h1', 1001), true)
  })
})
