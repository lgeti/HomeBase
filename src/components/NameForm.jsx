import { useState } from 'react'
import { friendlySaveError } from '../core/utils/expenseForm'

// A small inline form for naming something: creating or renaming a shopping list or an inventory group
export default function NameForm({ label = 'List name', placeholder = 'e.g., Temu, IKEA, Marketplace', emptyError = 'Enter a list name', initialName = '', submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setError(emptyError)
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await onSubmit(name.trim())
    } catch (failure) {
      setError(friendlySaveError(failure))
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-hb-border bg-hb-surface p-3 space-y-2">
      <label htmlFor="listName" className="block text-[13px] font-semibold text-hb-text2">{label}</label>
      <input
        id="listName"
        type="text"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          setError('')
        }}
        maxLength={40}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
      />
      {error && <p className="text-xs text-hb-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2">
          Cancel
        </button>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-hb-primary px-3 py-1.5 text-sm font-semibold text-hb-on-primary disabled:opacity-60">
          {isSaving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
