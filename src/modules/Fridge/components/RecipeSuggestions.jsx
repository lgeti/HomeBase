import { useState } from 'react'
import Icon from '../../../components/Icon'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { analyseRecipe, haveLabel } from '../recipes'

function SuggestionCard({ suggestion, fridgeItems, today, onSave, onDismiss }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState('idle') // idle | saving | saved
  const [error, setError] = useState('')
  const result = analyseRecipe({ ...suggestion, id: suggestion.name }, fridgeItems, today)

  const save = async () => {
    setError('')
    setState('saving')
    try {
      await onSave(suggestion)
      setState('saved')
    } catch (failure) {
      setError(friendlySaveError(failure))
      setState('idle')
    }
  }

  return (
    <article className="rounded-2xl border border-dashed border-hb-primary/40 bg-hb-primary-tint/50">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary"
        >
          <p className="text-[15px] font-semibold text-hb-text">{suggestion.name}</p>
          <p className={`text-xs ${result.canMake ? 'font-semibold text-hb-primary' : 'text-hb-text2'}`}>{haveLabel(result)}</p>
          {suggestion.usesFromFridge.length > 0 && (
            <p className="text-xs text-hb-text2">Uses {suggestion.usesFromFridge.join(', ')}</p>
          )}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(suggestion)}
          aria-label={`Hide ${suggestion.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-hb-text3"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-hb-primary/20 px-3.5 py-3">
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-hb-text">
            {suggestion.ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}>{ingredient}</li>)}
          </ul>
          {suggestion.steps && <p className="whitespace-pre-line text-sm text-hb-text">{suggestion.steps}</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3.5 pb-3">
        {error ? <p role="alert" className="text-xs text-hb-danger">{error}</p> : <span />}
        <button
          type="button"
          onClick={save}
          disabled={state !== 'idle'}
          className="shrink-0 rounded-lg bg-hb-primary px-3 py-1.5 text-sm font-semibold text-hb-on-primary disabled:opacity-60"
        >
          {state === 'saved' ? 'Saved to recipes' : state === 'saving' ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </article>
  )
}

// "Suggest recipes": asks the AI for ideas from what is in the fridge. Suggestions stay until saved or hidden.
export default function RecipeSuggestions({ fridgeItems, today, onSuggest, onSave }) {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const suggest = async () => {
    setError('')
    setIsLoading(true)
    try {
      setSuggestions(await onSuggest(today))
    } catch (failure) {
      setError(friendlySaveError(failure))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={suggest}
        disabled={isLoading || fridgeItems.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-hb-primary/40 bg-hb-surface py-2.5 text-sm font-semibold text-hb-primary disabled:opacity-50"
      >
        <Icon name="other" size={16} />
        {isLoading ? 'Thinking of recipes…' : suggestions.length ? 'Suggest different recipes' : 'Suggest recipes from the fridge'}
      </button>
      {fridgeItems.length === 0 && <p className="text-xs text-hb-text3">Add something to the fridge to get suggestions.</p>}
      {error && <p role="alert" className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>}
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.name}
          suggestion={suggestion}
          fridgeItems={fridgeItems}
          today={today}
          onSave={onSave}
          onDismiss={(hidden) => setSuggestions((current) => current.filter((item) => item !== hidden))}
        />
      ))}
    </section>
  )
}
