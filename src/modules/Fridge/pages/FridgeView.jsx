import { useState } from 'react'
import Icon from '../../../components/Icon'
import { todayDateString } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { expiryLabel, freshness, groupFridgeItems } from '../fridge'

const EXPIRY_COLORS = {
  expired: 'text-hb-danger font-semibold',
  soon: 'text-hb-warning font-semibold',
  ok: 'text-hb-text2',
}

// Asks where a used-up item goes: onto a shopping list, or just out of the fridge
function UsedUpPanel({ item, lists, onConfirm, onCancel }) {
  const [listId, setListId] = useState(lists[0]?.id || '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const confirm = async (chosenListId) => {
    setError('')
    setIsSaving(true)
    try {
      await onConfirm(item, chosenListId)
    } catch (failure) {
      setError(friendlySaveError(failure))
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-hb-primary/30 bg-hb-primary-tint px-3.5 py-3">
      <p className="text-sm text-hb-text">
        <span className="font-semibold">{item.name}</span> is used up. Add it to a shopping list?
      </p>
      {lists.length > 0 && (
        <div>
          <label htmlFor={`usedUpList-${item.id}`} className="sr-only">Shopping list</label>
          <select
            id={`usedUpList-${item.id}`}
            value={listId}
            onChange={(event) => setListId(event.target.value)}
            className="w-full rounded-xl border border-hb-input bg-hb-field px-3 py-2.5 text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-hb-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2">
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => confirm(null)}
          className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text disabled:opacity-60"
        >
          Just remove
        </button>
        {lists.length > 0 && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => confirm(listId)}
            className="rounded-lg bg-hb-primary px-3 py-1.5 text-sm font-semibold text-hb-on-primary disabled:opacity-60"
          >
            Add to list
          </button>
        )}
      </div>
    </div>
  )
}

function FridgeRow({ item, today, onEdit, onUsedUp }) {
  const state = freshness(item, today)
  const label = expiryLabel(item, today)

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hb-border bg-hb-surface px-3.5 py-3">
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary"
        aria-label={`Edit ${item.name}`}
      >
        <p className="text-[15px] font-semibold text-hb-text truncate">{item.name}</p>
        {label && <p className={`text-xs ${EXPIRY_COLORS[state]}`}>{label}</p>}
        {item.quantity && <p className="text-xs text-hb-text2 truncate">{item.quantity}</p>}
        {item.note && <p className="text-xs text-hb-text3 truncate">{item.note}</p>}
      </button>
      <button
        type="button"
        onClick={() => onUsedUp(item)}
        className="shrink-0 rounded-full border border-hb-input px-3 py-1.5 text-xs font-semibold text-hb-text2 hover:border-hb-primary hover:text-hb-primary transition"
      >
        Used up
      </button>
    </div>
  )
}

export default function FridgeView({ items, lists, isLoading, error, onQuickAdd, onEditItem, onUsedUp }) {
  const [usedUpId, setUsedUpId] = useState(null)
  const [quickName, setQuickName] = useState('')
  const [quickError, setQuickError] = useState('')
  const today = todayDateString()
  const { useSoon, rest } = groupFridgeItems(items, today)

  const quickAdd = async (event) => {
    event.preventDefault()
    const name = quickName.trim()
    if (!name) return
    setQuickError('')
    setQuickName('')
    try {
      await onQuickAdd({ name })
    } catch (failure) {
      setQuickName(name)
      setQuickError(friendlySaveError(failure))
    }
  }

  const confirmUsedUp = async (item, listId) => {
    await onUsedUp(item, listId)
    setUsedUpId(null)
  }

  const renderItem = (item) =>
    item.id === usedUpId ? (
      <UsedUpPanel key={item.id} item={item} lists={lists} onConfirm={confirmUsedUp} onCancel={() => setUsedUpId(null)} />
    ) : (
      <FridgeRow key={item.id} item={item} today={today} onEdit={onEditItem} onUsedUp={(chosen) => setUsedUpId(chosen.id)} />
    )

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="max-w-lg mx-auto p-4 space-y-3">
        <div>
          <h2 className="text-2xl font-semibold text-hb-text">Fridge</h2>
          <p className="text-xs text-hb-text2">
            {items.length === 0 ? 'Empty' : `${items.length} item${items.length === 1 ? '' : 's'}`}
            {useSoon.length > 0 && ` · ${useSoon.length} to use soon`}
          </p>
        </div>

        {error && <p className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>}

        <form onSubmit={quickAdd} className="flex gap-2">
          <label htmlFor="fridgeQuickAdd" className="sr-only">Add to the fridge</label>
          <input
            id="fridgeQuickAdd"
            type="text"
            value={quickName}
            onChange={(event) => {
              setQuickName(event.target.value)
              setQuickError('')
            }}
            maxLength={120}
            placeholder="Add to the fridge…"
            className="min-w-0 flex-1 rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
          />
          <button
            type="submit"
            disabled={!quickName.trim()}
            aria-label="Add to the fridge"
            className="flex w-11 shrink-0 items-center justify-center rounded-xl bg-hb-primary text-hb-on-primary disabled:opacity-40"
          >
            <Icon name="plus" size={20} />
          </button>
        </form>
        {quickError && <p role="alert" className="text-xs text-hb-danger">{quickError}</p>}

        {isLoading && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-hb-text2">Loading…</p>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-hb-text2">Nothing in the fridge yet</p>
            <p className="mt-1 text-xs text-hb-text3">Type above, or tap + to add an expiry date</p>
          </div>
        ) : (
          <>
            {useSoon.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-hb-warning">Use soon</h3>
                {useSoon.map(renderItem)}
              </section>
            )}
            {rest.length > 0 && (
              <section className="space-y-2 pt-1">
                {useSoon.length > 0 && (
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-hb-text2">Everything else</h3>
                )}
                {rest.map(renderItem)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
