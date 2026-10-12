import { useState } from 'react'
import { todayDateString } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { initialInventoryForm, inventoryFormToBody, warrantyEnd } from '../inventory'

const WARRANTY_YEARS = [1, 2, 3, 5]

// Pass `item` to edit it; without one the form adds a new item to `groupId`
export default function InventoryItemForm({ groups, groupId, item, onSubmit, onDelete, onCancel }) {
  const isEditing = Boolean(item)
  const [form, setForm] = useState(() => initialInventoryForm({ item, groupId }))
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
      setNameError('Enter what it is')
      return
    }
    run(() => onSubmit(inventoryFormToBody(form)))
  }

  const label = 'block text-[13px] font-semibold text-hb-text2 mb-1.5'
  const field = 'w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary transition'
  const warrantyFrom = form.purchasedOn || todayDateString()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <h2 className="text-xl font-semibold text-hb-text">{isEditing ? 'Edit Item' : 'Add to Inventory'}</h2>

      <div>
        <label htmlFor="inventoryName" className={label}>What is it?</label>
        <input
          id="inventoryName"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          maxLength={120}
          placeholder="e.g., Washing machine, Toilet paper"
          className={field}
          autoFocus={!isEditing}
        />
        {nameError && <p className="text-hb-danger text-xs mt-1">{nameError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="inventoryGroup" className={label}>Group</label>
          <select id="inventoryGroup" name="groupId" value={form.groupId} onChange={handleChange} className={field}>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="inventoryQuantity" className={label}>Quantity</label>
          <input
            id="inventoryQuantity"
            type="text"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            maxLength={30}
            placeholder="e.g., 8 rolls"
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="inventoryPurchased" className={label}>Bought on</label>
          <input id="inventoryPurchased" type="date" name="purchasedOn" value={form.purchasedOn} onChange={handleChange} className={field} />
        </div>
        <div>
          <label htmlFor="inventoryPrice" className={label}>Price</label>
          <div className="flex items-center gap-1.5 rounded-xl border border-hb-input bg-hb-field px-3 focus-within:ring-2 focus-within:ring-hb-primary transition">
            <span className="text-sm text-hb-text2" aria-hidden="true">€</span>
            <input
              id="inventoryPrice"
              type="number"
              name="price"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full border-none bg-transparent py-[11px] text-sm text-hb-text outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="inventoryWarranty" className={label}>Warranty until</label>
        <div className="flex gap-2">
          <input id="inventoryWarranty" type="date" name="warrantyUntil" value={form.warrantyUntil} onChange={handleChange} className={field} />
          {form.warrantyUntil && (
            <button
              type="button"
              onClick={() => choose('warrantyUntil', '')}
              className="shrink-0 rounded-xl border border-hb-input bg-hb-field px-3 text-sm font-semibold text-hb-text2"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {WARRANTY_YEARS.map((years) => {
            const date = warrantyEnd(warrantyFrom, years)
            const isOn = form.warrantyUntil === date
            return (
              <button
                key={years}
                type="button"
                onClick={() => choose('warrantyUntil', date)}
                aria-pressed={isOn}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isOn ? 'bg-hb-primary text-hb-on-primary' : 'bg-hb-surface2 text-hb-text2'}`}
              >
                {years} year{years === 1 ? '' : 's'}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-hb-text3">Counted from the purchase date, or today without one.</p>
      </div>

      <div>
        <label htmlFor="inventoryNote" className={label}>Note</label>
        <input
          id="inventoryNote"
          type="text"
          name="note"
          value={form.note}
          onChange={handleChange}
          maxLength={500}
          placeholder="e.g., model number, where it is kept"
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
          <button type="button" onClick={() => setIsConfirmingDelete(true)} className="self-start text-sm font-semibold text-hb-danger">
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
