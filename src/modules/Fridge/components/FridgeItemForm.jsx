import { useState } from 'react'
import { todayDateString } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { addDays, fridgeFormToBody, initialFridgeForm } from '../fridge'

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
]

// Pass `item` to edit it; without one the form adds a new item
export default function FridgeItemForm({ item, onSubmit, onDelete, onCancel }) {
  const isEditing = Boolean(item)
  const [form, setForm] = useState(() => initialFridgeForm(item))
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const today = todayDateString()

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
      setNameError('Enter what is in the fridge')
      return
    }
    run(() => onSubmit(fridgeFormToBody(form)))
  }

  const label = 'block text-[13px] font-semibold text-hb-text2 mb-1.5'
  const field = 'w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary transition'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <h2 className="text-xl font-semibold text-hb-text">{isEditing ? 'Edit Fridge Item' : 'Add to Fridge'}</h2>

      <div>
        <label htmlFor="fridgeName" className={label}>What is it?</label>
        <input
          id="fridgeName"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          maxLength={120}
          placeholder="e.g., Milk"
          className={field}
          autoFocus={!isEditing}
        />
        {nameError && <p className="text-hb-danger text-xs mt-1">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="fridgeQuantity" className={label}>Quantity</label>
        <input
          id="fridgeQuantity"
          type="text"
          name="quantity"
          value={form.quantity}
          onChange={handleChange}
          maxLength={30}
          placeholder="e.g., half a pack"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="fridgeExpires" className={label}>Expires</label>
        <div className="flex gap-2">
          <input
            id="fridgeExpires"
            type="date"
            name="expiresOn"
            value={form.expiresOn}
            onChange={handleChange}
            className={field}
          />
          {form.expiresOn && (
            <button
              type="button"
              onClick={() => choose('expiresOn', '')}
              className="shrink-0 rounded-xl border border-hb-input bg-hb-field px-3 text-sm font-semibold text-hb-text2"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_DATES.map((quick) => {
            const date = addDays(today, quick.days)
            const isOn = form.expiresOn === date
            return (
              <button
                key={quick.label}
                type="button"
                onClick={() => choose('expiresOn', date)}
                aria-pressed={isOn}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isOn ? 'bg-hb-primary text-hb-on-primary' : 'bg-hb-surface2 text-hb-text2'
                }`}
              >
                {quick.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="fridgeNote" className={label}>Note</label>
        <input
          id="fridgeNote"
          type="text"
          name="note"
          value={form.note}
          onChange={handleChange}
          maxLength={500}
          placeholder="e.g., opened, top shelf"
          className={field}
        />
      </div>

      {isEditing && (
        isConfirmingDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-hb-danger/30 bg-hb-danger-bg px-3 py-2.5">
            <p className="text-sm text-hb-text">Delete this item?</p>
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
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="self-start text-sm font-semibold text-hb-danger"
          >
            Delete item
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
