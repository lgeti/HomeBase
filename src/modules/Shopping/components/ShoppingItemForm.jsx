import { useState } from 'react'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { initialItemForm, itemFormToBody } from '../shopping'

// Pass `item` to edit it; without one the form adds a new item to `listId`
export default function ShoppingItemForm({ lists, listId, item, onSubmit, onDelete, onCancel }) {
  const isEditing = Boolean(item)
  const [form, setForm] = useState(() => initialItemForm({ item, listId }))
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const isSelling = form.kind === 'sell'
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
      setNameError(isSelling ? 'Enter what you are selling' : 'Enter what to buy')
      return
    }
    run(() => onSubmit(itemFormToBody(form)))
  }

  const label = 'block text-[13px] font-semibold text-hb-text2 mb-1.5'
  const field = 'w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary transition'
  const segment = (isOn) => `rounded-[10px] px-2 py-2.5 text-sm transition ${
    isOn ? 'bg-hb-seg-on text-hb-text font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-hb-text2 font-medium'
  }`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <h2 className="text-xl font-semibold text-hb-text">{isEditing ? 'Edit Item' : 'Add Item'}</h2>

      <div role="radiogroup" aria-label="Buying or selling" className="grid grid-cols-2 gap-1 rounded-[14px] bg-hb-surface2 p-1">
        {[
          { value: 'buy', text: 'Buying' },
          { value: 'sell', text: 'Selling' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={form.kind === option.value}
            onClick={() => choose('kind', option.value)}
            className={segment(form.kind === option.value)}
          >
            {option.text}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="itemName" className={label}>{isSelling ? 'What are you selling?' : 'What to buy?'}</label>
        <input
          id="itemName"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          maxLength={120}
          placeholder={isSelling ? 'e.g., Old desk chair' : 'e.g., Milk'}
          className={field}
          autoFocus={!isEditing}
        />
        {nameError && <p className="text-hb-danger text-xs mt-1">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="itemList" className={label}>List</label>
        <select id="itemList" name="listId" value={form.listId} onChange={handleChange} className={field}>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>{list.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="itemQuantity" className={label}>Quantity</label>
          <input
            id="itemQuantity"
            type="text"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            maxLength={30}
            placeholder="e.g., 2 kg"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="itemPrice" className={label}>{isSelling ? 'Asking price' : 'Price'}</label>
          <div className="flex items-center gap-1.5 rounded-xl border border-hb-input bg-hb-field px-3 focus-within:ring-2 focus-within:ring-hb-primary transition">
            <span className="text-sm text-hb-text2" aria-hidden="true">€</span>
            <input
              id="itemPrice"
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
        <label htmlFor="itemLink" className={label}>Link</label>
        <input
          id="itemLink"
          type="text"
          name="link"
          inputMode="url"
          value={form.link}
          onChange={handleChange}
          placeholder={isSelling ? 'Your listing' : 'Where to buy it'}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="itemNote" className={label}>Note</label>
        <input
          id="itemNote"
          type="text"
          name="note"
          value={form.note}
          onChange={handleChange}
          maxLength={500}
          placeholder="Anything else to remember"
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
