import { useState } from 'react'
import { todayDateString } from '../../../core/utils/calculations'
import { addDays } from '../../../core/utils/dates'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { choreFormToBody, FREQUENCIES, initialChoreForm } from '../chores'

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In a week', days: 7 },
]

// Pass `chore` to edit it; without one the form adds a new chore
export default function ChoreForm({ chore, members, onSubmit, onDelete, onCancel }) {
  const today = todayDateString()
  const isEditing = Boolean(chore)
  const [form, setForm] = useState(() => initialChoreForm(chore, today))
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
      setNameError('Enter a chore')
      return
    }
    if (!form.dueOn) {
      setSubmitError('Choose a date')
      return
    }
    run(() => onSubmit(choreFormToBody(form)))
  }

  const label = 'block text-[13px] font-semibold text-hb-text2 mb-1.5'
  const field = 'w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary transition'
  const segment = (isOn) => `truncate rounded-[10px] px-2 py-2.5 text-sm transition ${
    isOn ? 'bg-hb-seg-on text-hb-text font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-hb-text2 font-medium'
  }`
  const assignees = [{ id: '', name: 'Anyone' }, ...members.map((member) => ({ id: member.household_member_id, name: member.display_name }))]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <h2 className="text-xl font-semibold text-hb-text">{isEditing ? 'Edit Chore' : 'Add Chore'}</h2>

      <div>
        <label htmlFor="choreName" className={label}>Chore</label>
        <input
          id="choreName"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          maxLength={120}
          placeholder="e.g., Take out the bins"
          className={field}
          autoFocus={!isEditing}
        />
        {nameError && <p className="text-hb-danger text-xs mt-1">{nameError}</p>}
      </div>

      <div>
        <p id="how-often" className={label}>How often?</p>
        <div role="radiogroup" aria-labelledby="how-often" className="grid grid-cols-4 gap-1 rounded-[14px] bg-hb-surface2 p-1">
          {FREQUENCIES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={form.frequency === option.value}
              onClick={() => choose('frequency', option.value)}
              className={segment(form.frequency === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="choreDue" className={label}>{form.frequency === 'once' || isEditing ? 'Due' : 'First time'}</label>
        <input id="choreDue" type="date" name="dueOn" value={form.dueOn} onChange={handleChange} className={field} />
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_DATES.map((quick) => {
            const date = addDays(today, quick.days)
            const isOn = form.dueOn === date
            return (
              <button
                key={quick.label}
                type="button"
                onClick={() => choose('dueOn', date)}
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
        <p id="who-does-it" className={label}>Who does it?</p>
        <div
          role="radiogroup"
          aria-labelledby="who-does-it"
          className="grid gap-1 rounded-[14px] bg-hb-surface2 p-1"
          style={{ gridTemplateColumns: `repeat(${Math.min(assignees.length, 3)}, minmax(0, 1fr))` }}
        >
          {assignees.map((assignee) => (
            <button
              key={assignee.id || 'anyone'}
              type="button"
              role="radio"
              aria-checked={form.assigneeMemberId === assignee.id}
              onClick={() => choose('assigneeMemberId', assignee.id)}
              className={segment(form.assigneeMemberId === assignee.id)}
            >
              {assignee.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="choreNote" className={label}>Note</label>
        <input
          id="choreNote"
          type="text"
          name="note"
          value={form.note}
          onChange={handleChange}
          maxLength={500}
          placeholder="e.g., recycling goes out on even weeks"
          className={field}
        />
      </div>

      {isEditing && (
        isConfirmingDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-hb-danger/30 bg-hb-danger-bg px-3 py-2.5">
            <p className="text-sm text-hb-text">Delete this chore?</p>
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
            Delete chore
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
