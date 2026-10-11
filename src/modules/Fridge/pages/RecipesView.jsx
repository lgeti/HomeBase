import { useState } from 'react'
import Icon from '../../../components/Icon'
import { todayDateString } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { linkHost } from '../../Shopping/shopping'
import RecipeSuggestions from '../components/RecipeSuggestions'
import { expiryLabel } from '../fridge'
import { cookedLabel, haveLabel, rankRecipes } from '../recipes'

// Picks a shopping list and adds a recipe's missing ingredients to it
function MissingPanel({ missing, lists, onAdd, onCancel }) {
  const [listId, setListId] = useState(lists[0]?.id || '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const add = async () => {
    setError('')
    setIsSaving(true)
    try {
      await onAdd(listId)
    } catch (failure) {
      setError(friendlySaveError(failure))
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-hb-primary/30 bg-hb-primary-tint p-3">
      <p className="text-sm text-hb-text">Add {missing.length} missing ingredient{missing.length === 1 ? '' : 's'} to:</p>
      <label className="sr-only" htmlFor="missingList">Shopping list</label>
      <select
        id="missingList"
        value={listId}
        onChange={(event) => setListId(event.target.value)}
        className="w-full rounded-xl border border-hb-input bg-hb-field px-3 py-2.5 text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
      >
        {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
      </select>
      {error && <p role="alert" className="text-xs text-hb-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2">
          Cancel
        </button>
        <button
          type="button"
          onClick={add}
          disabled={isSaving || !listId}
          className="rounded-lg bg-hb-primary px-3 py-1.5 text-sm font-semibold text-hb-on-primary disabled:opacity-60"
        >
          {isSaving ? 'Adding…' : 'Add to list'}
        </button>
      </div>
    </div>
  )
}

function RecipeCard({ result, lists, today, isOpen, onToggleOpen, onFavourite, onCooked, onAddMissing, onEdit }) {
  const { recipe, have, missing, usesSoon } = result
  const [showMissingPanel, setShowMissingPanel] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const haveIngredients = new Set(have.map((entry) => entry.ingredient))
  const cooked = cookedLabel(recipe, today)

  const act = async (action, message) => {
    setError('')
    try {
      await action()
      setNotice(message)
    } catch (failure) {
      setError(friendlySaveError(failure))
    }
  }

  return (
    <article className="rounded-2xl border border-hb-border bg-hb-surface">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary"
        >
          <p className="text-[15px] font-semibold text-hb-text">{recipe.name}</p>
          <p className={`text-xs ${result.canMake ? 'font-semibold text-hb-primary' : 'text-hb-text2'}`}>{haveLabel(result)}</p>
          {usesSoon.length > 0 && (
            <p className="text-xs font-semibold text-hb-warning">
              Uses {usesSoon.map((item) => `${item.name} (${expiryLabel(item, today).toLowerCase()})`).join(', ')}
            </p>
          )}
          {!isOpen && missing.length > 0 && <p className="truncate text-xs text-hb-text3">Missing: {missing.join(', ')}</p>}
          {cooked && <p className="text-xs text-hb-text3">{cooked}</p>}
        </button>
        <button
          type="button"
          onClick={() => act(() => onFavourite(recipe), '')}
          aria-pressed={recipe.isFavourite}
          aria-label={recipe.isFavourite ? `Remove ${recipe.name} from favourites` : `Add ${recipe.name} to favourites`}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${recipe.isFavourite ? 'text-hb-warning' : 'text-hb-text3'}`}
        >
          <Icon name="star" size={18} style={recipe.isFavourite ? { fill: 'currentColor' } : undefined} />
        </button>
      </div>

      {isOpen && (
        <div className="space-y-3 border-t border-hb-border px-3.5 py-3">
          {recipe.ingredients.length > 0 && (
            <ul className="space-y-1">
              {recipe.ingredients.map((ingredient, index) => {
                const isMissing = missing.includes(ingredient)
                return (
                  <li key={`${index}-${ingredient}`} className="flex items-center gap-2 text-sm">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${isMissing ? 'border border-hb-input' : 'bg-hb-primary text-hb-on-primary'}`}>
                      {!isMissing && <Icon name="check" size={11} strokeWidth={3} />}
                    </span>
                    <span className={isMissing ? 'text-hb-text2' : 'text-hb-text'}>{ingredient}</span>
                    {!isMissing && !haveIngredients.has(ingredient) && <span className="text-xs text-hb-text3">(at home)</span>}
                  </li>
                )
              })}
            </ul>
          )}
          {recipe.steps && <p className="whitespace-pre-line text-sm text-hb-text">{recipe.steps}</p>}
          {recipe.link && (
            <a href={recipe.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-hb-primary">
              <Icon name="link" size={14} />
              {linkHost(recipe.link)}
            </a>
          )}

          {notice && <p role="status" className="text-xs font-semibold text-hb-primary">{notice}</p>}
          {error && <p role="alert" className="text-xs text-hb-danger">{error}</p>}

          {showMissingPanel ? (
            <MissingPanel
              missing={missing}
              lists={lists}
              onCancel={() => setShowMissingPanel(false)}
              onAdd={async (listId) => {
                await onAddMissing(listId, missing)
                setShowMissingPanel(false)
                setNotice(`Added to ${lists.find((list) => list.id === listId)?.name}`)
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => act(() => onCooked(recipe), 'Marked as cooked today')}
                className="rounded-lg bg-hb-primary px-3 py-1.5 text-sm font-semibold text-hb-on-primary"
              >
                Cooked it
              </button>
              {missing.length > 0 && lists.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMissingPanel(true)}
                  className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text"
                >
                  Add missing to list
                </button>
              )}
              <button
                type="button"
                onClick={() => onEdit(recipe)}
                className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function RecipesView({ recipes, fridgeItems, lists, isLoading, error, onFavourite, onCooked, onAddMissing, onEditRecipe, onSuggest, onSaveSuggestion }) {
  const [openId, setOpenId] = useState(null)
  const today = todayDateString()
  const ranked = rankRecipes(recipes, fridgeItems, today)
  const canMakeCount = ranked.filter((result) => result.canMake).length

  return (
    <div className="space-y-3">
      <p className="text-xs text-hb-text2">
        {recipes.length === 0
          ? 'Your household’s recipes, ranked by what is in the fridge'
          : `${canMakeCount} you can make now · best matches first`}
      </p>

      {error && <p className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>}

      <RecipeSuggestions fridgeItems={fridgeItems} today={today} onSuggest={onSuggest} onSave={onSaveSuggestion} />

      {isLoading && recipes.length === 0 ? (
        <p className="py-8 text-center text-sm text-hb-text2">Loading…</p>
      ) : recipes.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-hb-text2">No recipes yet</p>
          <p className="mt-1 text-xs text-hb-text3">Tap + to add one you like, or save a suggestion</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((result) => (
            <RecipeCard
              key={result.recipe.id}
              result={result}
              lists={lists}
              today={today}
              isOpen={openId === result.recipe.id}
              onToggleOpen={() => setOpenId(openId === result.recipe.id ? null : result.recipe.id)}
              onFavourite={onFavourite}
              onCooked={(recipe) => onCooked(recipe, today)}
              onAddMissing={onAddMissing}
              onEdit={onEditRecipe}
            />
          ))}
        </div>
      )}
    </div>
  )
}
