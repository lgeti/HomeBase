import { useState } from 'react'
import Icon from '../../../components/Icon'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { initialRecipeForm, recipeFormToBody } from '../recipes'

// Pass `recipe` to edit it; without one the form adds a new recipe
export default function RecipeForm({ recipe, onSubmit, onDelete, onCancel }) {
  const isEditing = Boolean(recipe)
  const [form, setForm] = useState(() => initialRecipeForm(recipe))
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const choose = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))
  const handleChange = (event) => {
    choose(event.target.name, event.target.value)
    if (event.target.name === 'name') setNameError('')
  }

  // Saving and deleting share the busy state and the error line
  const run = async (action) => {
    setSubmitError('')
    setIsSaving(true)
    try {
      await action()
    } catch (failure) {
      setSubmitError(friendlySaveError(failure))
      setIsSaving(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSaving) return
    if (!form.name.trim()) {
      setNameError('Enter a recipe name')
      return
    }
    run(() => onSubmit(recipeFormToBody(form)))
  }

  const label = 'block text-[13px] font-semibold text-hb-text2 mb-1.5'
  const field = 'w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary transition'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-hb-text">{isEditing ? 'Edit Recipe' : 'Add Recipe'}</h2>
        <button
          type="button"
          onClick={() => choose('isFavourite', !form.isFavourite)}
          aria-pressed={form.isFavourite}
          aria-label="Favourite"
          title="Favourite"
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
            form.isFavourite ? 'border-hb-warning/40 bg-hb-warning-bg text-hb-warning' : 'border-hb-border text-hb-text3'
          }`}
        >
          <Icon name="star" size={20} style={form.isFavourite ? { fill: 'currentColor' } : undefined} />
        </button>
      </div>

      <div>
        <label htmlFor="recipeName" className={label}>Recipe</label>
        <input
          id="recipeName"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          maxLength={120}
          placeholder="e.g., Ham and cheese omelette"
          className={field}
          autoFocus={!isEditing}
        />
        {nameError && <p className="text-hb-danger text-xs mt-1">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="recipeIngredients" className={label}>Ingredients, one per line</label>
        <textarea
          id="recipeIngredients"
          name="ingredients"
          value={form.ingredients}
          onChange={handleChange}
          rows={5}
          placeholder={'3 eggs\n50 g ham\ngrated cheese\nsalt and pepper'}
          className={`${field} resize-y`}
        />
        <p className="mt-1 text-xs text-hb-text3">Salt, pepper, oil and water are always counted as at home.</p>
      </div>

      <div>
        <label htmlFor="recipeSteps" className={label}>Steps</label>
        <textarea
          id="recipeSteps"
          name="steps"
          value={form.steps}
          onChange={handleChange}
          rows={4}
          maxLength={5000}
          placeholder="How to make it (optional)"
          className={`${field} resize-y`}
        />
      </div>

      <div>
        <label htmlFor="recipeLink" className={label}>Link</label>
        <input
          id="recipeLink"
          type="text"
          inputMode="url"
          name="link"
          value={form.link}
          onChange={handleChange}
          placeholder="Where the recipe is from (optional)"
          className={field}
        />
      </div>

      {isEditing && (
        isConfirmingDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-hb-danger/30 bg-hb-danger-bg px-3 py-2.5">
            <p className="text-sm text-hb-text">Delete this recipe?</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2"
              >
                Keep
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => run(onDelete)}
                className="rounded-lg bg-hb-danger-solid px-3 py-1.5 text-sm font-semibold text-hb-on-danger disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setIsConfirmingDelete(true)} className="self-start text-sm font-semibold text-hb-danger">
            Delete recipe
          </button>
        )
      )}

      <div className="sticky bottom-0 flex flex-col gap-2 bg-hb-sheet pt-1">
        {submitError && (
          <p role="alert" className="rounded-xl border border-hb-danger/30 bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">
            {submitError}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[14px] border border-hb-input bg-hb-sheet py-3.5 text-[15px] font-semibold text-hb-text hover:bg-hb-surface2 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-[14px] bg-hb-primary py-3.5 text-[15px] font-semibold text-hb-on-primary hover:opacity-90 disabled:opacity-60 transition"
          >
            {isSaving ? 'Saving…' : isEditing ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </form>
  )
}
