import { useState } from 'react'
import Icon from '../../../components/Icon'
import { todayDateString } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { expiryLabel, freshness, groupFridgeItems, itemsIn, LOCATIONS } from '../fridge'

const EXPIRY_COLORS = {
  expired: 'text-hb-danger font-semibold',
  soon: 'text-hb-warning font-semibold',
  ok: 'text-hb-text2',
}

const BAR_BUTTON = 'rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text disabled:opacity-60'
const BAR_PRIMARY = 'rounded-lg bg-hb-primary px-3 py-1.5 text-sm font-semibold text-hb-on-primary disabled:opacity-60'

// Shown while items are ticked: mark them all used up (optionally onto a shopping list) or move them
function SelectionBar({ count, lists, otherPlace, onUsedUp, onMove, onClear }) {
  const [step, setStep] = useState('actions')
  const [listId, setListId] = useState(lists[0]?.id || '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const noun = count === 1 ? '1 item' : `${count} items`

  const run = async (action) => {
    setError('')
    setIsSaving(true)
    try {
      await action()
    } catch (failure) {
      setError(friendlySaveError(failure))
      setIsSaving(false)
    }
  }

  return (
    <div className="sticky top-0 z-10 space-y-2.5 rounded-2xl border border-hb-primary/30 bg-hb-primary-tint px-3.5 py-3">
      {step === 'usedUp' ? (
        <>
          <p className="text-sm text-hb-text">
            <span className="font-semibold">{noun}</span> used up. Add {count === 1 ? 'it' : 'them'} to a shopping list?
          </p>
          {lists.length > 0 && (
            <div>
              <label htmlFor="usedUpList" className="sr-only">Shopping list</label>
              <select
                id="usedUpList"
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
            <button type="button" onClick={() => setStep('actions')} className={`${BAR_BUTTON} text-hb-text2`}>
              Back
            </button>
            <button type="button" disabled={isSaving} onClick={() => run(() => onUsedUp(null))} className={BAR_BUTTON}>
              Just remove
            </button>
            {lists.length > 0 && (
              <button type="button" disabled={isSaving} onClick={() => run(() => onUsedUp(listId))} className={BAR_PRIMARY}>
                Add to list
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-hb-text">{noun} selected</p>
            <button type="button" onClick={onClear} className="text-sm font-semibold text-hb-text2 hover:text-hb-text">
              Cancel
            </button>
          </div>
          {error && <p role="alert" className="text-xs text-hb-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={isSaving} onClick={() => run(onMove)} className={BAR_BUTTON}>
              Move {otherPlace.to}
            </button>
            <button type="button" disabled={isSaving} onClick={() => setStep('usedUp')} className={BAR_PRIMARY}>
              Used up
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function FridgeRow({ item, today, isSelected, isSelecting, onEdit, onToggle }) {
  const state = freshness(item, today)
  const label = expiryLabel(item, today)

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${
        isSelected ? 'border-hb-primary bg-hb-primary-tint' : 'border-hb-border bg-hb-surface'
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`Select ${item.name}`}
        onClick={() => onToggle(item)}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary ${
          isSelected ? 'border-hb-primary bg-hb-primary text-hb-on-primary' : 'border-hb-input text-transparent hover:border-hb-primary'
        }`}
      >
        <Icon name="check" size={14} />
      </button>
      <button
        type="button"
        // While picking items, tapping anywhere on a row ticks it instead of opening it
        onClick={() => (isSelecting ? onToggle(item) : onEdit(item))}
        className="flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary"
        aria-label={isSelecting ? `Select ${item.name}` : `Edit ${item.name}`}
      >
        <p className="text-[15px] font-semibold text-hb-text truncate">{item.name}</p>
        {label && <p className={`text-xs ${EXPIRY_COLORS[state]}`}>{label}</p>}
        {item.quantity && <p className="text-xs text-hb-text2 truncate">{item.quantity}</p>}
        {item.note && <p className="text-xs text-hb-text3 truncate">{item.note}</p>}
      </button>
    </div>
  )
}

const TABS = [
  { id: 'items', label: 'Fridge' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'inventory', label: 'Inventory' },
]

// The Home section: the fridge's contents, or `recipesView` / `inventoryView` on those tabs
export default function FridgeView({ tab, onTabChange, recipesView, inventoryView, items, lists, isLoading, error, onQuickAdd, onEditItem, onUsedUp, onMove }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [quickName, setQuickName] = useState('')
  const [quickError, setQuickError] = useState('')
  const today = todayDateString()
  // The Fridge and Pantry tabs show the same list for their own place
  const location = tab === 'pantry' ? 'pantry' : 'fridge'
  const otherLocation = location === 'fridge' ? 'pantry' : 'fridge'
  const place = LOCATIONS[location]
  const shown = itemsIn(items, location)
  const { useSoon, rest } = groupFridgeItems(shown, today)
  const useSoonAll = groupFridgeItems(items, today).useSoon.length
  // Ticks only count for items still on this tab, so a live update can't act on items that moved away
  const selected = shown.filter((item) => selectedIds.includes(item.id))

  const quickAdd = async (event) => {
    event.preventDefault()
    const name = quickName.trim()
    if (!name) return
    setQuickError('')
    setQuickName('')
    try {
      await onQuickAdd({ name, location })
    } catch (failure) {
      setQuickName(name)
      setQuickError(friendlySaveError(failure))
    }
  }

  const toggleSelected = (item) =>
    setSelectedIds((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]))

  const clearSelection = () => setSelectedIds([])

  const usedUpSelected = async (listId) => {
    await Promise.all(selected.map((item) => onUsedUp(item, listId)))
    clearSelection()
  }

  const moveSelected = async () => {
    await Promise.all(selected.map((item) => onMove(item, otherLocation)))
    clearSelection()
  }

  const renderItem = (item) => (
    <FridgeRow
      key={item.id}
      item={item}
      today={today}
      isSelected={selectedIds.includes(item.id)}
      isSelecting={selected.length > 0}
      onEdit={onEditItem}
      onToggle={toggleSelected}
    />
  )

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="max-w-lg mx-auto p-4 space-y-3">
        <div>
          <h2 className="text-2xl font-semibold text-hb-text">Home</h2>
          <p className="text-xs text-hb-text2">
            Fridge {itemsIn(items, 'fridge').length} · Pantry {itemsIn(items, 'pantry').length}
            {useSoonAll > 0 && ` · ${useSoonAll} to use soon`}
          </p>
        </div>

        <div role="tablist" aria-label="Home" className="grid grid-cols-4 gap-1 rounded-[14px] bg-hb-surface2 p-1">
          {TABS.map((option) => {
            const isOn = tab === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isOn}
                onClick={() => {
                  clearSelection()
                  onTabChange(option.id)
                }}
                className={`truncate rounded-[10px] px-1 py-2 text-sm transition ${
                  isOn ? 'bg-hb-seg-on text-hb-text font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-hb-text2 font-medium'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {tab === 'recipes' ? recipesView : tab === 'inventory' ? inventoryView : (
          <>
            {error && <p className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>}

            {selected.length > 0 ? (
              <SelectionBar
                count={selected.length}
                lists={lists}
                otherPlace={LOCATIONS[otherLocation]}
                onUsedUp={usedUpSelected}
                onMove={moveSelected}
                onClear={clearSelection}
              />
            ) : (
              <form onSubmit={quickAdd} className="flex gap-2">
                <label htmlFor="fridgeQuickAdd" className="sr-only">Add {place.to}</label>
                <input
                  id="fridgeQuickAdd"
                  type="text"
                  value={quickName}
                  onChange={(event) => {
                    setQuickName(event.target.value)
                    setQuickError('')
                  }}
                  maxLength={120}
                  placeholder={`Add ${place.to}…`}
                  className="min-w-0 flex-1 rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
                />
                <button
                  type="submit"
                  disabled={!quickName.trim()}
                  aria-label={`Add ${place.to}`}
                  className="flex w-11 shrink-0 items-center justify-center rounded-xl bg-hb-primary text-hb-on-primary disabled:opacity-40"
                >
                  <Icon name="plus" size={20} />
                </button>
              </form>
            )}
            {quickError && <p role="alert" className="text-xs text-hb-danger">{quickError}</p>}

            {isLoading && shown.length === 0 ? (
              <p className="py-8 text-center text-sm text-hb-text2">Loading…</p>
            ) : shown.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-hb-text2">Nothing {place.in} yet</p>
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
          </>
        )}
      </div>
    </div>
  )
}
